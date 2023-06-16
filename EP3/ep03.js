/*
    EP03 de MAC0420/MAC5744 - Simulação de movimento coletivo

    Nome: Luis Vitor Zerkowski
    NUSP: 9837201
*/

const FUNDO = [0.0, 0.0, 0.0, 1.0];

var gl;
var gCanvas;
var gShader = {};

var gPosicoes = [];
var gCores = [];
var gObjetos = [];
var gUltimoT = Date.now();

var gVertices = [];
var gIndices = [];
var gCores = [];

//Variável de interface de comandos
var interface = {
    pausa: true,
    passo: false,
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
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(gIndices), gl.STATIC_DRAW);

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

    gl.perspectiva = perspective(45, 1, 1, 2000);
    gl.uniformMatrix4fv(gShader.uPerspective, false, flatten(gl.perspectiva));
};

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
    this.vel_theta = [];
    for (var i = 0; i < 3; i++) {
        this.vel_theta.push(vel_theta[i]*Math.PI/180)
    }
    this.theta = [0, 0, 0];
    this.escala = escala;

}

function atualiza_theta(objeto) {
    objeto.theta[0] += objeto.vel_theta[0]//*delta;
    objeto.theta[1] += objeto.vel_theta[1]//*delta;
    objeto.theta[2] += objeto.vel_theta[2]//*delta;
}

function matriz_model(objeto) {
    let model = translate(objeto.pos[0], objeto.pos[1], objeto.pos[2]);
    
    let rx = rotateX(objeto.theta[0]);
    let ry = rotateY(objeto.theta[1]);
    let rz = rotateZ(objeto.theta[2]);
    model = mult(model, mult(rz, mult(ry, rx)));
    
    model = mult(model, scale(objeto.escala, objeto.escala, objeto.escala));

    return model;
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    /*
    var tempo = Date.now();
    var delta = (tempo - gUltimoT)/1000;
    gUltimoT = tempo;
    */

    let eye = vec3(150, 150, 150);
    let at = vec3(0, 0, 0);
    let up = vec3(0, 1, 0);
    gl.vista = lookAt(eye, at, up);

    for (var i = 0; i < gObjetos.length; i++) {
        let model = matriz_model(gObjetos[i]);
        gl.uniformMatrix4fv(gShader.uModelView, false, flatten(mult(gl.vista, model)));
        gl.drawElements(gl.TRIANGLES, gObjetos[i].indices.length, gl.UNSIGNED_BYTE, i*gObjetos[i].indices.length);
        
        if(!interface.pausa) {
            atualiza_theta(gObjetos[i]);
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

    gObjetos.push(new Cubo(cores_cubo, 0, [0, 0, 0], [0, 0, 0], 30));
    gObjetos.push(new Cubo(cores_cubo, 1, [100, 30, 20], [0, 0, 90], 10));
    gObjetos.push(new Cubo(cores_cubo, 2, [-50, 40, 50], [30, 10, 50], 40));


    //Cria shaders e buffers
    crie_shaders();
  
    //Inicializa a animação
    render();
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
        for (var i = 0; i < 25; i++) {
            for (var j = 0; j < gObjetos.length; j++) {
                atualiza_theta(gObjetos[j]);
            }
        }
    }
}