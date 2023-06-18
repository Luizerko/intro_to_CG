/*
    EP03 de MAC0420/MAC5744 - Simulação de movimento coletivo

    Nome: Luis Vitor Zerkowski
    NUSP: 9837201
*/

const FUNDO = [0.1, 0.1, 0.6, 1.0];

var gl;
var gCanvas;
var gShader = {};

var gPosicoes = [];
var gCores = [];
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

function crie_shaders() {
    //Cria o programa
    gShader.program = makeProgram(gl, gVertexShaderSrc, gFragmentShaderSrc);
    gl.useProgram(gShader.program);

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

    var bufVertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufVertices);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(gVertices), gl.STATIC_DRAW);

    //Associa o atributo de posição do shader ao buffer gPosicoes
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

    gShader.uModelView = gl.getUniformLocation(gShader.program, "uModelView");
    gShader.uPerspective = gl.getUniformLocation(gShader.program, "uPerspective");

    gl.perspectiva = perspective(camera.fovy, camera.aspect, camera.near, camera.far);
    gl.uniformMatrix4fv(gShader.uPerspective, false, flatten(gl.perspectiva));
};

function insere_triangulo(esfera, a, b, c) {
    esfera.vertices.push(a);
    esfera.vertices.push(b);
    esfera.vertices.push(c);

    esfera.cores.push(vec4(Math.random()+0.1, Math.random()+0.1, Math.random()+0.1, 1));
    esfera.cores.push(vec4(Math.random()+0.1, Math.random()+0.1, Math.random()+0.1, 1));
    esfera.cores.push(vec4(Math.random()+0.1, Math.random()+0.1, Math.random()+0.1, 1));
}

function divide_triangulo(esfera, a, b, c, ndivs) {
    if (ndivs > 0) {
        let ab = mix(a, b, 0.5);
        let bc = mix(b, c, 0.5);
        let ca = mix(c, a, 0.5);
    
        ab = normalize(ab);
        bc = normalize(bc);
        ca = normalize(ca);
    
        divide_triangulo(esfera, a, ab, ca, ndivs - 1);
        divide_triangulo(esfera, ab, b, bc, ndivs - 1);
        divide_triangulo(esfera, ca, bc, c, ndivs - 1);
        divide_triangulo(esfera, bc, ca, ab, ndivs - 1);
    }

    else {
        insere_triangulo(esfera, a, b, c);
    }
}

function Esfera(pos, vel_theta, escala, ndivs) {
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

    for (let i = 0; i < triangulo.length; i++) {
        let a, b, c;
        [a, b, c] = triangulo[i];
        divide_triangulo(this, a, b, c, ndivs);
    }

    this.indices = [];
    for (var i = 0; i < this.vertices.length; i++) {
        this.indices.push(i+gOffsetCubo+gOffsetEsfera);
    }
    gOffsetEsfera += this.indices.length;

    this.pos = pos;
    this.vel_theta = vel_theta;
    this.theta = [0, 0, 0];
    this.escala = escala;
}

function Cubo(cores, indice, pos, vel_theta, escala) {
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
    this.cores = [];
    for(var i = 0; i < cores.length; i++) {
        this.cores.push(vec4(cores[i]));
    }
    
    let offset = indice*24
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

    this.pos = pos;
    this.vel_theta = vel_theta;
    this.theta = [0, 0, 0];
    this.escala = escala;

}

function inicializa_camera() {
    atualiza_camera(camera.theta[0], 0, 0);
    atualiza_camera(0, camera.theta[1], 0);
    atualiza_camera(0, 0, camera.theta[2]);
}

function atualiza_camera(rx, ry, rz) {
    var n = normalize(subtract(camera.pos, camera.at));
    var u = normalize(cross(camera.up, n));
    var aux_center = subtract(camera.at, camera.pos);

    if (Math.abs(rx) > 0) {
        var pitch = rotate(rx, u);
        aux_center = mult(pitch, vec4(aux_center[0], aux_center[1], aux_center[2], 1));
        aux_center = vec3(aux_center[0], aux_center[1], aux_center[2]);

        camera.at = add(aux_center, camera.pos);

        if (Math.abs(dot(n, camera.up)) >= 0.95) {
            var aux_up = mult(pitch, vec4(camera.up[0], camera.up[1], camera.up[2], 1));
            camera.up = vec3(aux_up[0], aux_up[1], aux_up[2]);
        }
    }

    else if (Math.abs(ry) > 0) {
        var yaw = rotate(ry, camera.up);
        aux_center = mult(yaw, vec4(aux_center[0], aux_center[1], aux_center[2], 1));
        aux_center = vec3(aux_center[0], aux_center[1], aux_center[2]);

        camera.at = add(aux_center, camera.pos);
    }

    else {
        var roll = rotate(rz, n);
        var aux_up = mult(roll, vec4(camera.up[0], camera.up[1], camera.up[2], 1));
        camera.up = vec3(aux_up[0], aux_up[1], aux_up[2]);
    }
}

function anda_camera(delta) {
    camera.pos = add(camera.pos, mult(camera.vtrans*delta, normalize(subtract(camera.at, camera.pos))));
}

function atualiza_theta(objeto, delta) {
    objeto.theta[0] = (objeto.theta[0] + objeto.vel_theta[0]*delta)%360;
    objeto.theta[1] = (objeto.theta[1] + objeto.vel_theta[1]*delta)%360;
    objeto.theta[2] = (objeto.theta[2] + objeto.vel_theta[2]*delta)%360;
}

function matriz_model(objeto) {
    let model = translate(objeto.pos[0], objeto.pos[1], objeto.pos[2]);
    
    let rx = rotateX(objeto.theta[0]);
    let ry = rotateY(objeto.theta[1]);
    let rz = rotateZ(objeto.theta[2]);
    model = mult(model, mult(rz, mult(ry, rx)));
    
    model = mult(model, scale(objeto.escala[0], objeto.escala[1], objeto.escala[2]));

    return model;
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    
    var tempo = Date.now();
    var delta = (tempo - gUltimoT)/1000;
    gUltimoT = tempo;

    if (!interface.pausa) {
        anda_camera(delta);
    }
    gl.vista = lookAt(camera.pos, camera.at, camera.up);

    for (var i = 0; i < gObjetos.length; i++) {
        let model = matriz_model(gObjetos[i]);
        gl.uniformMatrix4fv(gShader.uModelView, false, flatten(mult(gl.vista, model)));

        if (i < gCubos) {
            gl.drawElements(gl.TRIANGLES, gObjetos[i].indices.length, gl.UNSIGNED_SHORT, i*gObjetos[i].indices.length*2);
        }
        else {
            gl.drawElements(gl.TRIANGLES, gObjetos[i].indices.length, gl.UNSIGNED_SHORT, (gCubos*36*2)+(i-gCubos)*gObjetos[i].indices.length*2);
        }
        
        if(!interface.pausa) {
            atualiza_theta(gObjetos[i], delta);
        }
    }

    window.requestAnimationFrame(render);
}

window.onload = main;

function main() {
    //Pega o objeto do canvas e incializa o webGL
    gCanvas = document.getElementById("cena_canvas");
    gl = gCanvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, gCanvas.width, gCanvas.height);
    gl.clearColor(FUNDO[0], FUNDO[1], FUNDO[2], FUNDO[3]);
    gl.enable(gl.DEPTH_TEST);

    inicializa_camera();

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

    gObjetos.push(new Esfera([40, -80, -60], [0, 0, 30], [50, 30, 15], 3));
    gObjetos.push(new Esfera([30, 80, -30], [20, 20, 0], [40, 40, 40], 3));
    gObjetos.push(new Esfera([0, -20, 80], [90, 0, 0], [30, 30, 10], 3));
    gObjetos.push(new Esfera([-2, 60, 60], [0, 70, 0], [10, 10, 10], 3));


    //Cria shaders e buffers
    crie_shaders();
  
    //Inicializa a animação
    render();

    window.addEventListener('keydown', callback_comandos);
    window.addEventListener('keyup', callback_desaperta);
}

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

function callback_passo() {
    if(interface.pausa) {
        for (var j = 0; j < gObjetos.length; j++) {
            atualiza_theta(gObjetos[j], 1);
        }
    }
}

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
            atualiza_camera(1, 0, 0);
        }

        else if (e.key == 'X' || e.key == 'x') {
            atualiza_camera(-1, 0, 0);
        }

        else if (e.key == 'A' || e.key == 'a') {
            atualiza_camera(0, 1, 0);
        }

        else if (e.key == 'D' || e.key == 'd') {
            atualiza_camera(0, -1, 0);
        }

        else if (e.key == 'Z' || e.key == 'z') {
            atualiza_camera(0, 0, 2);
        }

        else if (e.key == 'C' || e.key == 'c') {
            atualiza_camera(0, 0, -2);
        }
    }
}

function callback_desaperta(e) {
    interface.pressionado = false;
}