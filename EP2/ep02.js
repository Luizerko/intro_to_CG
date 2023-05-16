/*
    EP02 de MAC0420/MAC5744 - Simulação de movimento coletivo

    Nome: Luis Vitor Zerkowski
    NUSP: 9837201
 */

//Definição de constantes e variáveis globais
const FUNDO = [0, 0.41, 0.58, 1];
const cor_lider = vec4(0.65, 0.65, 0.65, 1);
const cor_cardume = vec4(0.75, 0.75, 0.75, 1);

var gl;
var gCanvas;
var gShader = {};

var gPosicoes = [];
var gCores = [];
var gObjetos = [];
var gUltimoT = Date.now();

//Variável de interface de comandos
var interface = {
    apertado: false,
    animacao: true,
}

//Vertex shader
var gVertexShaderSrc = `#version 300 es
in vec2 aPosition;

uniform vec2 uResolution;

in vec4 aColor;
out vec4 vColor;

void main() {
    vec2 escala1 = aPosition / uResolution;
    vec2 escala2 = escala1 * 2.0;
    vec2 clipSpace = escala2 - 1.0;

    gl_Position = vec4(clipSpace, 0, 1);
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

window.onload = main;

//Classe de peixes
function Peixe(x, y, lado, vx, vy, cor) {
    //Inicialização da velocidade e cor do peixe
    this.vel = vec2(vx, vy);
    this.cor = cor;

    //Computando ângulo da cabeça do peixe
    var vec_horizontal = vec2(1, 0);
    var theta;
    if (vy >= 0) {
        theta = Math.acos(dot(vec_horizontal, this.vel)/length(this.vel));
    }
    else {
        theta = 2*Math.PI - Math.acos(dot(vec_horizontal, this.vel)/length(this.vel));
    }

    //Inicialização dos vértices dada a posição do baricentro, o tamanho do peixe e o ângulo de inclinação do mesmo
    this.pos = vec2(x, y);

    this.lado = lado;
    this.vertices = [
        vec2(x+Math.cos(theta)*(2*this.lado/3), y+Math.sin(theta)*(2*this.lado/3)),
        vec2(x+Math.cos(theta+2*Math.PI/3)*(2*this.lado/3), y+Math.sin(theta+2*Math.PI/3)*(2*this.lado/3)),
        vec2(x+Math.cos(theta-2*Math.PI/3)*(2*this.lado/3), y+Math.sin(theta-2*Math.PI/3)*(2*this.lado/3)),
    ];

    this.nv = this.vertices.length;
    
    //Configuração dos buffers de posição e cor do peixe
    gPosicoes.push(this.vertices[0]);
    gPosicoes.push(this.vertices[1]); 
    gPosicoes.push(this.vertices[2]);
    gCores.push(cor);
    gCores.push(cor);
    gCores.push(cor);

    //Método de atualização de posição do peixe dado um delta de tempo
    this.atualiza_tempo = function (delta) {
        //Atualização da posição do baricentro
        this.pos = add(this.pos, mult(delta, this.vel));

        //Cômputo de novas posições e velocidades considerando os limites do canvas e limites de velocidade impostos
        let x, y;
        let vx, vy;
        [x, y] = this.pos;
        [vx, vy] = this.vel;

        
        if (vx > gCanvas.width) { vx = gCanvas.width - 2 }
        else if (-vx > gCanvas.width) { vx = -(gCanvas.width - 2)};
        if (vx > 0 && vx < 2) { vx = 2 }
        else if (-vx > 0 && -vx < 2) { vx = -2 };

        if (vy > gCanvas.height) { vy = gCanvas.height - 2 }
        else if (-vy > gCanvas.height) { vy = -(gCanvas.height - 2) };
        if (vy > 0 && vy < 2) { vy = 2 }
        else if (-vy > 0 && -vy < 2) { vy = -2 };

        if (x < 0) { x = -x; vx = -vx; };
        if (y < 0) { y = -y; vy = -vy; };
        if (x >= gCanvas.width) { x = gCanvas.width; vx = -vx; };
        if (y >= gCanvas.height) { y = gCanvas.height; vy = -vy; };

        this.vel = vec2(vx, vy);

        //Computando ângulo da cabeça do peixe
        var vec_horizontal = vec2(1, 0);
        var theta;
        if (vy>= 0) {
            theta = Math.acos(dot(vec_horizontal, this.vel)/length(this.vel));
        }
        else {
            theta = 2*Math.PI - Math.acos(dot(vec_horizontal, this.vel)/length(this.vel));
        }

        //Cômputo dos vértices do trinângulo dada nova posição
        this.vertices = [
            vec2(x+Math.cos(theta)*(2*this.lado/3), y+Math.sin(theta)*(2*this.lado/3)),
            vec2(x+Math.cos(theta+2*Math.PI/3)*(2*this.lado/3), y+Math.sin(theta+2*Math.PI/3)*(2*this.lado/3)),
            vec2(x+Math.cos(theta-2*Math.PI/3)*(2*this.lado/3), y+Math.sin(theta-2*Math.PI/3)*(2*this.lado/3)),
        ];

        //Atualização de buffers de posição do peixe
        gPosicoes.push(this.vertices[0]);
        gPosicoes.push(this.vertices[1]); 
        gPosicoes.push(this.vertices[2]);
    }

    this.atualiza_comando = function(delta_vx, delta_vy) {
        this.vel = add(this.vel, vec2(delta_vx, delta_vy));
    }
};

function crie_shaders() {
    //Cria o programa
    gShader.program = makeProgram(gl, gVertexShaderSrc, gFragmentShaderSrc);
    gl.useProgram(gShader.program);

    //Passa dados do buffer de posições para a GPU
    gShader.bufPosicoes = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gShader.bufPosicoes);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(gPosicoes), gl.STATIC_DRAW);

    //Associa o atributo de posição do shader ao buffer gPosicoes
    var aPositionLoc = gl.getAttribLocation(gShader.program, "aPosition");

    //Configuração do atributo para leitura de buffer e ativação do atributo
    gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPositionLoc);

    //Repetição dos processos para buffer de cores
    var bufCores = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufCores);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(gCores), gl.STATIC_DRAW);
    var aColorLoc = gl.getAttribLocation(gShader.program, "aColor");
    gl.vertexAttribPointer(aColorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aColorLoc);

    //Resolução de uniform de de largura e comprimento do canvas
    gShader.uResolution = gl.getUniformLocation(gShader.program, "uResolution");
    gl.uniform2f(gShader.uResolution, gCanvas.width, gCanvas.height);

};

function desenhe() {
    //Computa tempo de atualização de frames e prepara variáveis para próxima atualização
    let now = Date.now();
    let delta = (now - gUltimoT) / 1000;
    gUltimoT = now;

    //Seta o intervalo de atualização para zero, pausando a animação se a tecla de pause estiver pressionada
    if (!interface.animacao) { delta = 0 };
  
    //Recomputa para todo objeto vertices
    gPosicoes = [];
    for (let i = 0; i < gObjetos.length; i++)
      gObjetos[i].atualiza_tempo(delta);
  
    //Atualiza o buffer de vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, gShader.bufPosicoes);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(gPosicoes), gl.STATIC_DRAW);
  
    //Limpa a janela e desenha próximo quadro
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, gPosicoes.length);
  
    //Confugara função de animação
    window.requestAnimationFrame(desenhe);
}

function main() {
    //Pega o objeto do canvas e incializa o webGL
    gCanvas = document.getElementById("movimento_canvas");
    gl = gCanvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");
  
    //Cria peixe líder
    gObjetos.push(new Peixe(400, 400, 20, gCanvas.width/2, gCanvas.height/4, cor_lider));
    
    //Cria peixe de cardume
    gObjetos.push(new Peixe(200, 100, 20, gCanvas.width/4, gCanvas.height/4, cor_cardume));
  
    //Cria shaders e buffers
    crie_shaders();
  
    //Limpa o contexto
    gl.clearColor(FUNDO[0], FUNDO[1], FUNDO[2], FUNDO[3]);
  
    //Inicializa a animação
    desenhe();

    //Construindo eventos de teclado
    window.addEventListener('keydown', callback_keyboard);
    window.addEventListener('keyup', callback_keyboard_up);
}

//Eventos de pressionar tecla
function callback_keyboard(e) {

    //Verifica se algum botão já está sendo pressionado
    if (interface.apertado == false) {
        peixe_lider = gObjetos[0];
        [vx, vy] = peixe_lider.vel;
        
        //Aumenta a velocidade na direção da cabeça do peixe em 10% 
        if (e.key == 'w' || e.key == 'W') {
            peixe_lider.atualiza_comando(vx*0.1, vy*0.1);
        }

        //Diminui a velocidade na direção da cabeça do peixe em 10%
        if (e.key == 's' || e.key == 'S') {
            peixe_lider.atualiza_comando(-vx*0.1, -vy*0.1);
        }

        //Vira a cabeça do peixe 15 graus no sentido anti-horário
        if (e.key == 'a' || e.key == 'A') {
            var vec_horizontal = vec2(1, 0);
            var theta;
            if (vy >= 0) {
                theta = Math.acos(dot(vec_horizontal, peixe_lider.vel)/length(peixe_lider.vel));
            }
            else {
                theta = 2*Math.PI - Math.acos(dot(vec_horizontal, peixe_lider.vel)/length(peixe_lider.vel));
            }

            theta = theta + Math.PI/12;
            new_vx = length(peixe_lider.vel)*Math.cos(theta);
            new_vy = length(peixe_lider.vel)*Math.sin(theta);

            peixe_lider.atualiza_comando(new_vx - vx, new_vy - vy);
        }

        //Vira a cabeça do peixe 15 graus no sentido horário
        if (e.key == 'd' || e.key == 'D') {
            var vec_horizontal = vec2(1, 0);
            var theta;
            if (vy >= 0) {
                theta = Math.acos(dot(vec_horizontal, peixe_lider.vel)/length(peixe_lider.vel));
            }
            else {
                theta = 2*Math.PI - Math.acos(dot(vec_horizontal, peixe_lider.vel)/length(peixe_lider.vel));
            }

            theta = theta - Math.PI/12;
            new_vx = length(peixe_lider.vel)*Math.cos(theta);
            new_vy = length(peixe_lider.vel)*Math.sin(theta);

            peixe_lider.atualiza_comando(new_vx - vx, new_vy - vy);
        }

        //Pausa a animação
        if (e.key == 'p' || e.key == 'P') {
            interface.animacao = 1 - interface.animacao;
        }
    }

    //Atualiza variável de controle em interface para não permitir segurar botão
    interface.apertado = true;
}

//Evento de desapertar o botão do teclado
function callback_keyboard_up(e) {
    
    //Atualiza variável de controle em interface para desapertar o botão e permitir pressionar o próximo comando 
    interface.apertado = false;
}