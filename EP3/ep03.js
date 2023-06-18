/*
    EP03 de MAC0420/MAC5744 - Navegação em Cena

    Nome: Luis Vitor Zerkowski
    NUSP: 9837201
*/

//Criação de variáveis globais e definição de constantes
const FUNDO = [0.1, 0.1, 0.6, 1.0];

var gl;
var gCanvas;
var gShader = {};

var gObjetos = [];
var gCubos = 3;
var gOffsetCubo = 0;
var gOffsetEsfera = 0;
var gUltimoT = Date.now();

var gVertices = [];
var gIndices = [];
var gCores = [];

//Variável de interface de comandos
var interface = {
    pausa: true,
    passo: false,
    pressionado: false,
}

//Criação da variável da câmera. Mudança de theta inicial para [0, 0, 20] a fim de adequá-lo à minha cena 
var camera = {
    pos    : vec3(150, 150, 150),
    at     : vec3(0, 0, 0),
    up     : vec3(0, 1, 0),
    fovy   : 45.0,
    aspect : 1.0,
    near   : 1,
    far    : 2000,    
    vtrans : 1,
    theta  : vec3(0, 0, 20),
}

//Vertex shader
var gVertexShaderSrc = `#version 300 es

// aPosition é um buffer de entrada
in vec3 aPosition;

uniform mat4 uModelView;
uniform mat4 uPerspective;

in vec4 aColor;  // buffer com a cor de cada vértice
out vec4 vColor; // varying -> passado ao fShader

void main() {
    gl_Position = uPerspective * uModelView * vec4(aPosition, 1);
    vColor = aColor; 
}
`;

//Fragment shader
var gFragmentShaderSrc = `#version 300 es

precision highp float;

in vec4 vColor;
out vec4 outColor;

void main() {
  outColor = vColor;
}
`;

//Função de criação de shader e binding de buffers, atributos e uniformes
function crie_shaders() {
    //Cria o programa
    gShader.program = makeProgram(gl, gVertexShaderSrc, gFragmentShaderSrc);
    gl.useProgram(gShader.program);

    //Varredura de objetos para construção dos arrays de vértices, cores e índices
    for (var i = 0; i < gObjetos.length; i++) {
        objeto = gObjetos[i];
        for (var j = 0; j < objeto.vertices.length; j++) {
            gVertices.push(objeto.vertices[j]);
            gCores.push(objeto.cores[j])
        }
        for (var j = 0; j < objeto.indices.length; j++) {
            gIndices.push(objeto.indices[j]);
        }
    }

    //Passa dados do buffer de índices para a GPU
    gShader.bufIndices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gShader.bufIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(gIndices), gl.STATIC_DRAW);

    //Passa dados do buffer de vértices para GPU
    var bufVertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufVertices);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(gVertices), gl.STATIC_DRAW);

    //Pega a localização do atributo de vértices do vertex shader
    var aPositionLoc = gl.getAttribLocation(gShader.program, "aPosition");

    //Configuração do atributo para leitura de buffer e ativação do atributo
    gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPositionLoc);

    //Repetição dos processos para buffer de cores
    gShader.bufCores = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gShader.bufCores);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(gCores), gl.STATIC_DRAW);
    var aColorLoc = gl.getAttribLocation(gShader.program, "aColor");
    gl.vertexAttribPointer(aColorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aColorLoc);

    //Pega localização dos uniformes das matrizes ModelView e Perspective
    gShader.uModelView = gl.getUniformLocation(gShader.program, "uModelView");
    gShader.uPerspective = gl.getUniformLocation(gShader.program, "uPerspective");

    //Cria matriz de perspectiva dados parâmetros da câmera e associa ao uniforme de Perspective
    gl.perspectiva = perspective(camera.fovy, camera.aspect, camera.near, camera.far);
    gl.uniformMatrix4fv(gShader.uPerspective, false, flatten(gl.perspectiva));
};

//Função que insere posição e cores dos três vértices de um triângulo no conjunto de vértices da esfera
function insere_triangulo(esfera, a, b, c) {
    esfera.vertices.push(a);
    esfera.vertices.push(b);
    esfera.vertices.push(c);

    esfera.cores.push(vec4(Math.random()+0.1, Math.random()+0.1, Math.random()+0.1, 1));
    esfera.cores.push(vec4(Math.random()+0.1, Math.random()+0.1, Math.random()+0.1, 1));
    esfera.cores.push(vec4(Math.random()+0.1, Math.random()+0.1, Math.random()+0.1, 1));
}

//Função recursiva que computa quatro subtriângulos para todo triângulo de uma face da esfera. A profundidade da recursão é determinada
//pelo parâmetro ndivs
function divide_triangulo(esfera, a, b, c, ndivs) {
    if (ndivs > 0) {
        let ab = mix(a, b, 0.5);
        let bc = mix(b, c, 0.5);
        let ca = mix(c, a, 0.5);
    
        ab = normalize(ab);
        bc = normalize(bc);
        ca = normalize(ca);
    
        //Chamada recursiva da função com atenção às ordens dos vértices, garantindo que todo triângulo desenhado terá a ordem
        // (a, b, c) -> (canto direito inferior, ponta superior, canto esquerdo inferior), isso considerando a observação do
        //triângulo com uma ponta pra cima
        divide_triangulo(esfera, a, ab, ca, ndivs - 1);
        divide_triangulo(esfera, ab, b, bc, ndivs - 1);
        divide_triangulo(esfera, ca, bc, c, ndivs - 1);
        divide_triangulo(esfera, bc, ca, ab, ndivs - 1);
    }

    else {
        insere_triangulo(esfera, a, b, c);
    }
}

//Classe de esferas
function Esfera(pos, vel_theta, escala, ndivs) {
    //Definição de vértices iniciais
    let vp = [
        vec3(1.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0),
        vec3(0.0, 0.0, 1.0),
    ];
    
    let vn = [
        vec3(-1.0, 0.0, 0.0),
        vec3(0.0, -1.0, 0.0),
        vec3(0.0, 0.0, -1.0),
    ];
    
    //Definição de triângulos iniciais (com ndivs = 0)
    let triangulo = [
        [vp[0], vp[1], vp[2]],
        [vn[2], vp[1], vp[0]],
    
        [vp[2], vn[1], vp[0]],
        [vp[0], vn[1], vn[2]],
    
        [vp[2], vp[1], vn[0]],
        [vn[0], vp[1], vn[2]],
    
        [vn[0], vn[1], vp[2]],
        [vn[2], vn[1], vn[0]],
    ];
    
    this.vertices = [];
    this.cores = [];

    //Cômputo de vértices e cores com profundidade ndivs
    for (let i = 0; i < triangulo.length; i++) {
        let a, b, c;
        [a, b, c] = triangulo[i];
        divide_triangulo(this, a, b, c, ndivs);
    }

    //Inserção de índices com offset dos cubos e de potenciais outras esferas
    this.indices = [];
    for (var i = 0; i < this.vertices.length; i++) {
        this.indices.push(i+gOffsetCubo+gOffsetEsfera);
    }
    gOffsetEsfera += this.indices.length;

    //Configurações de cena da esfera
    this.pos = pos;
    this.vel_theta = vel_theta;
    this.theta = [0, 0, 0];
    this.escala = escala;
}

//Classe de cubos
function Cubo(cores, indice, pos, vel_theta, escala) {
    //Definição de vértices. Nota-se a repetição de todo vértice 3 vezes utilizada para possibilitar o desenho de faces com cores
    //sólidas, sem interpolação de cores
    this.vertices = [
        vec3(-0.5, -0.5, -0.5),
        vec3(0.5, -0.5, -0.5),
        vec3(0.5, 0.5, -0.5),
        vec3(-0.5, 0.5, -0.5),

        vec3(-0.5, -0.5, 0.5),
        vec3(0.5, -0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(-0.5, 0.5, 0.5),

        vec3(-0.5, -0.5, -0.5),
        vec3(0.5, -0.5, -0.5),
        vec3(0.5, -0.5, 0.5),
        vec3(-0.5, -0.5, 0.5),

        vec3(-0.5, 0.5, -0.5),
        vec3(0.5, 0.5, -0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(-0.5, 0.5, 0.5),

        vec3(-0.5, -0.5, -0.5),
        vec3(-0.5, 0.5, -0.5),
        vec3(-0.5, 0.5, 0.5),
        vec3(-0.5, -0.5, 0.5),

        vec3(0.5, -0.5, -0.5),
        vec3(0.5, 0.5, -0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(0.5, -0.5, 0.5)
    ];

    //Adição de cores passadas ao cubo
    this.cores = [];
    for(var i = 0; i < cores.length; i++) {
        this.cores.push(vec4(cores[i]));
    }
    
    //Cômputo de índices dos vértices do cubo com offset de vértice de cubos anteriores - quantidade de cubos anteriores dada por indice
    let offset = indice*this.vertices.length;
    this.indices = [
        0, 2, 1,
        0, 3, 2,

        4, 5, 6,
        4, 6, 7,

        8, 9, 10,
        8, 10, 11,

        12, 14, 13,
        12, 15, 14,

        16, 18, 17,
        16, 19, 18,

        20, 21, 22,
        20, 22, 23
    ];
    for (var i = 0; i < this.indices.length; i++) {
        this.indices[i] = this.indices[i] + offset;
    }

    //Configurações de cena do cubo
    this.pos = pos;
    this.vel_theta = vel_theta;
    this.theta = [0, 0, 0];
    this.escala = escala;

}

//Inicialização de câmera dados [pitch, yaw, roll] iniciais
function inicializa_camera() {
    atualiza_camera(camera.theta[0], 0, 0);
    atualiza_camera(0, camera.theta[1], 0);
    atualiza_camera(0, 0, camera.theta[2]);
}

//Função de atualização da vista da câmera dado [rx = pitch, ry = yaw, rz = roll]
function atualiza_camera(rx, ry, rz) {
    //Cômputo de vetores de referência da câmera e movimentação virtual da câmera para camera.at para aplicação das devidas transformações
    //no ponto de centralização, camera.at. Sobre os vetores, n é o vetor que aponta no sentido contrário de camera.at e u o é ovetor que
    //aponta para a direita da câmera
    var n = normalize(subtract(camera.pos, camera.at));
    var u = normalize(cross(camera.up, n));
    var aux_center = subtract(camera.at, camera.pos);

    //Rotação em relação a u
    if (Math.abs(rx) > 0) {
        var pitch = rotate(rx, u);
        aux_center = mult(pitch, vec4(aux_center[0], aux_center[1], aux_center[2], 1));
        aux_center = vec3(aux_center[0], aux_center[1], aux_center[2]);

        camera.at = add(aux_center, camera.pos);

        //Ajuste do vetor up da câmera para evitar alinhamento do mesmo com o vetor que aponta para o ponto de centralização, camera.at.
        //Caso ocorresse, não seria possível computar os outros parâmetros da câmera, pois teríamos dois vetores LD
        if (Math.abs(dot(n, camera.up)) >= 0.95) {
            var aux_up = mult(pitch, vec4(camera.up[0], camera.up[1], camera.up[2], 1));
            camera.up = vec3(aux_up[0], aux_up[1], aux_up[2]);
        }
    }

    //Rotação em relação a v, vetor ortogonal a n e u
    else if (Math.abs(ry) > 0) {
        var v = normalize(cross(n, u));
        var yaw = rotate(ry, v);
        aux_center = mult(yaw, vec4(aux_center[0], aux_center[1], aux_center[2], 1));
        aux_center = vec3(aux_center[0], aux_center[1], aux_center[2]);

        camera.at = add(aux_center, camera.pos);
    }

    //Rotação em relação a n
    else {
        var roll = rotate(rz, n);
        var aux_up = mult(roll, vec4(camera.up[0], camera.up[1], camera.up[2], 1));
        camera.up = vec3(aux_up[0], aux_up[1], aux_up[2]);
    }
}

//Atualização da posição da câmera dada sua velocidade camera.vtrans e o tempo percorrido delta
function anda_camera(delta) {
    camera.pos = add(camera.pos, mult(camera.vtrans*delta, normalize(subtract(camera.at, camera.pos))));
}

//Atualização de ângulos dos objetos, objeto.theta[i], dadas suas velocidades angulares objeto.vel_theta[i] e o tempo percorrido delta
function atualiza_theta(objeto, delta) {
    objeto.theta[0] = (objeto.theta[0] + objeto.vel_theta[0]*delta)%360;
    objeto.theta[1] = (objeto.theta[1] + objeto.vel_theta[1]*delta)%360;
    objeto.theta[2] = (objeto.theta[2] + objeto.vel_theta[2]*delta)%360;
}

//Cômputo da matriz model de cada objeto respeitando a ordem das transformações, escala, rotação e translação.
//Note que a rotação é feita através de ângulos de euler e na ordem rotação_x, rotação_y, rotação_z
function matriz_model(objeto) {
    let model = translate(objeto.pos[0], objeto.pos[1], objeto.pos[2]);
    
    let rx = rotateX(objeto.theta[0]);
    let ry = rotateY(objeto.theta[1]);
    let rz = rotateZ(objeto.theta[2]);
    model = mult(model, mult(rz, mult(ry, rx)));
    
    model = mult(model, scale(objeto.escala[0], objeto.escala[1], objeto.escala[2]));

    return model;
}

//Função de renderização
function render() {
    //Limpa a tela com a cor de fundo e ativa corretamente os parâmetros de orientação de faces
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    
    //Computa tempo passado desde a última renderização
    var tempo = Date.now();
    var delta = (tempo - gUltimoT)/1000;
    gUltimoT = tempo;

    //Movimenta a câmera em direção a camera.at dada sua velocidade camera.vtrans e o tempo passado delta. Em seguida, é feito
    //o cômputo da matriz View da câmera
    if (!interface.pausa) {
        anda_camera(delta);
    }
    gl.vista = lookAt(camera.pos, camera.at, camera.up);

    //Transformação de cada objeto com ModelView e respectivo desenho
    for (var i = 0; i < gObjetos.length; i++) {
        //Cômputo da matriz ModelView e associação ao uniforme ModelView
        let model = matriz_model(gObjetos[i]);
        gl.uniformMatrix4fv(gShader.uModelView, false, flatten(mult(gl.vista, model)));

        //Desenho de cubos considerando os offsets de outros cubos
        if (i < gCubos) {
            gl.drawElements(gl.TRIANGLES, gObjetos[i].indices.length, gl.UNSIGNED_SHORT, i*gObjetos[i].indices.length*2);
        }
        //Desenho de esferas considerando offsets de todos os cubos e de outras esferas
        else {
            gl.drawElements(gl.TRIANGLES, gObjetos[i].indices.length, gl.UNSIGNED_SHORT, (gCubos*36*2)+(i-gCubos)*gObjetos[i].indices.length*2);
        }
        
        //Atualização de ângulo do objeto se a cena não estiver pausada
        if(!interface.pausa) {
            atualiza_theta(gObjetos[i], delta);
        }
    }

    //Função de animação
    window.requestAnimationFrame(render);
}

window.onload = main;

function main() {
    //Pega o objeto do canvas e incializa o webGL
    gCanvas = document.getElementById("cena_canvas");
    gl = gCanvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    //Cria a visualização no canvas, determina a cor de fundo da cena e ativa o desenho em profundidade
    gl.viewport(0, 0, gCanvas.width, gCanvas.height);
    gl.clearColor(FUNDO[0], FUNDO[1], FUNDO[2], FUNDO[3]);
    gl.enable(gl.DEPTH_TEST);

    //Inicializa a câmera rodando-a devidamente com o [pitch, yaw, roll] iniciais
    inicializa_camera();

    //Definição de cores dos cubos e inicialização dos mesmos
    let cores_cubo = [
        vec4(1, 1, 0, 1),
        vec4(1, 1, 0, 1),
        vec4(1, 1, 0, 1),
        vec4(1, 1, 0, 1),
        
        vec4(0, 0, 1, 1),
        vec4(0, 0, 1, 1),
        vec4(0, 0, 1, 1),
        vec4(0, 0, 1, 1),

        vec4(1, 0, 1, 1),
        vec4(1, 0, 1, 1),
        vec4(1, 0, 1, 1),
        vec4(1, 0, 1, 1),

        vec4(0, 1, 0, 1),
        vec4(0, 1, 0, 1),
        vec4(0, 1, 0, 1),
        vec4(0, 1, 0, 1),
        
        vec4(0, 1, 1, 1),
        vec4(0, 1, 1, 1),
        vec4(0, 1, 1, 1),
        vec4(0, 1, 1, 1),

        vec4(1, 0, 0, 1),
        vec4(1, 0, 0, 1),
        vec4(1, 0, 0, 1),
        vec4(1, 0, 0, 1),
    ];
    gObjetos.push(new Cubo(cores_cubo, 0, [0, 0, 0], [0, 0, 0], [30, 30, 30]));
    gObjetos.push(new Cubo(cores_cubo, 1, [100, 30, 20], [0, 90, 0], [20, 10, 10]));
    gObjetos.push(new Cubo(cores_cubo, 2, [-50, 40, 50], [30, 0, 50], [40, 40, 40]));
    gOffsetCubo += gCubos*gObjetos[0].vertices.length;

    //Inicialização das esferas
    gObjetos.push(new Esfera([40, -80, -60], [0, 0, 30], [50, 30, 15], 3));
    gObjetos.push(new Esfera([30, 80, -30], [20, 20, 0], [40, 40, 40], 3));
    gObjetos.push(new Esfera([0, -20, 80], [90, 0, 0], [30, 30, 10], 3));
    gObjetos.push(new Esfera([-2, 60, 60], [0, 70, 0], [10, 10, 10], 3));


    //Chama a função de resolução de shaders e buffers
    crie_shaders();
  
    //Inicializa a animação
    render();

    //Criação de eventos e callbacks para tratar comandos do teclado
    window.addEventListener('keydown', callback_comandos);
    window.addEventListener('keyup', callback_desaperta);
}

//Callback de pausa da cena e atualização da escrita no botão, Executa/Pausa, no HTML
function callback_executa_pausa() {
    interface.pausa = 1 - interface.pausa;
    
    let element = document.getElementById("executa_pausa");
    if (interface.pausa) {
        element.innerHTML = "Executa";
    }
    else {
        element.innerHTML = "Pausa";
    }
}

//Dá um passo de 1 segundo na animação, rotacionando os objetos e andando a câmera com delta = 1
function callback_passo() {
    if(interface.pausa) {
        for (var j = 0; j < gObjetos.length; j++) {
            atualiza_theta(gObjetos[j], 1);
            anda_camera(1);
        }
    }
}

//Callback de comandos do teclado que age sobre a velocidade da câmera, J, K, L, e [pitch, yaw, roll] da câmera, W, X, A, D, Z, C
//quando a animação não está pausada e nenhum outro botão já está pressionado
function callback_comandos(e) {
    if (!interface.pressionado && !interface.pausa) {
        interface.pressionado = true;

        if (e.key == 'L' || e.key == 'l') {
            camera.vtrans += 1;
        }

        else if (e.key == 'J' || e.key == 'j') {
            camera.vtrans -= 1;
        }

        else if (e.key == 'K' || e.key == 'k') {
            camera.vtrans = 0;
        }

        else if (e.key == 'W' || e.key == 'w') {
            atualiza_camera(2, 0, 0);
        }

        else if (e.key == 'X' || e.key == 'x') {
            atualiza_camera(-2, 0, 0);
        }

        else if (e.key == 'A' || e.key == 'a') {
            atualiza_camera(0, 2, 0);
        }

        else if (e.key == 'D' || e.key == 'd') {
            atualiza_camera(0, -2, 0);
        }

        else if (e.key == 'Z' || e.key == 'z') {
            atualiza_camera(0, 0, 2);
        }

        else if (e.key == 'C' || e.key == 'c') {
            atualiza_camera(0, 0, -2);
        }
    }
}

//Callback para despressionar os botões. A variável de botões pressionados é utilizada para evitar o pressionar de múltiplos
//botões ao mesmo tempo e para evitar duplicações de comando quando do pressionar de um botão
function callback_desaperta(e) {
    interface.pressionado = false;
}