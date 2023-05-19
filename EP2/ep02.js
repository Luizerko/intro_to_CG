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
    passo: false,
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
    this.altura = Math.sqrt(3)*this.lado/2;
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
        //if (vx > 0 && vx < 2) { vx = 2 }
        //else if (-vx > 0 && -vx < 2) { vx = -2 };

        if (vy > gCanvas.height) { vy = gCanvas.height - 2 }
        else if (-vy > gCanvas.height) { vy = -(gCanvas.height - 2) };
        //if (vy > 0 && vy < 2) { vy = 2 }
        //else if (-vy > 0 && -vy < 2) { vy = -2 };

        var raio_de_impacto = 2*this.altura/3;
        if (x - raio_de_impacto < 0) { x = raio_de_impacto+1; vx = -vx; };
        if (y - raio_de_impacto < 0) { y = raio_de_impacto+1; vy = -vy; };
        if (x + raio_de_impacto >= gCanvas.width) { x = gCanvas.width - (raio_de_impacto+1); vx = -vx; };
        if (y + raio_de_impacto >= gCanvas.height) { y = gCanvas.height - (raio_de_impacto+1); vy = -vy; };
        
        this.pos = vec2(x, y);
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
            vec2(x+Math.cos(theta)*(2*this.altura/3), y+Math.sin(theta)*(2*this.altura/3)),
            vec2(x+Math.cos(theta+2*Math.PI/3)*(2*this.altura/3), y+Math.sin(theta+2*Math.PI/3)*(2*this.altura/3)),
            vec2(x+Math.cos(theta-2*Math.PI/3)*(2*this.altura/3), y+Math.sin(theta-2*Math.PI/3)*(2*this.altura/3)),
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

function separacao(raio_influencia) {
    var num_atualiza = 0;
    var soma_atualiza = vec2(0, 0);

    for (var i = 1; i < gObjetos.length; i++) {
        peixe = gObjetos[i];
        [x, y] = peixe.pos;
        [vx, vy] = peixe.vel;

        for (var j = 1; j < gObjetos.length; j++) {
            if (j != i) {
                peixe_aux = gObjetos[j];
                [x_aux, y_aux] = peixe_aux.pos;
                [vx_aux, vy_aux] = peixe_aux.vel;

                var dist_vec = vec2(x - x_aux, y - y_aux);
                var dist = length(dist_vec);

                if (dist <= raio_influencia) {

                    num_atualiza += 1;
                    if (dist < 2) {
                        dist_vec = vec2(5, 5);
                    }
                    soma_atualiza = add(soma_atualiza, mult(3/Math.log(dist)+1, dist_vec));
                }
            }
        }

        if (num_atualiza != 0) {
            [delta_x, delta_y] = mult(1/num_atualiza, soma_atualiza);
            peixe.atualiza_comando(delta_x, delta_y);
        }
        num_atualiza = 0;
        soma_atualiza = vec2(0, 0);
    }
}

function alinhamento(raio_influencia) {
    var soma_velocidade = 0;
    var velocidade_x = 0;
    var velocidade_y = 0;

    for (var i = 1; i < gObjetos.length; i++) {
        peixe = gObjetos[i];
        [x, y] = peixe.pos;
        [vx, vy] = peixe.vel;

        for (var j = 1; j < gObjetos.length; j++) {
            if (j != i) {
                peixe_aux = gObjetos[j];
                [x_aux, y_aux] = peixe_aux.pos;
                [vx_aux, vy_aux] = peixe_aux.vel;

                var dist = Math.sqrt(Math.pow(x - x_aux, 2) + Math.pow(y - y_aux, 2));

                if (dist <= raio_influencia) {
                    soma_velocidade = soma_velocidade + 1;
                    velocidade_x = velocidade_x + vx_aux;
                    velocidade_y = velocidade_y + vy_aux;
                }
            }
        }

        if (soma_velocidade != 0) {
            peixe.atualiza_comando((velocidade_x/soma_velocidade-vx)*0.1, (velocidade_y/soma_velocidade-vy)*0.1)
        }
        soma_velocidade = 0;
        velocidade_x = 0;
        velocidade_y = 0;
    }

}

function coesao(raio_influencia) {
    var soma_baricentro = 0;
    var baricentro_x = 0;
    var baricentro_y = 0;
    
    for (var i = 1; i < gObjetos.length; i++) {
        peixe = gObjetos[i];
        [x, y] = peixe.pos;
        [vx, vy] = peixe.vel;

        for (var j = 1; j < gObjetos.length; j++) {
            if (j != i) {
                peixe_aux = gObjetos[j];
                [x_aux, y_aux] = peixe_aux.pos;
                [vx_aux, vy_aux] = peixe_aux.vel;

                var dist = Math.sqrt(Math.pow(x - x_aux, 2) + Math.pow(y - y_aux, 2));

                if (dist <= raio_influencia) {
                    soma_baricentro = soma_baricentro + 1;
                    baricentro_x = baricentro_x + x_aux;
                    baricentro_y = baricentro_y + y_aux;
                }
            }
        }
        
        if (soma_baricentro != 0) {
            peixe.atualiza_comando((baricentro_x/soma_baricentro-x)*0.15, (baricentro_y/soma_baricentro-y)*0.15)
        }
        soma_baricentro = 0;
        baricentro_x = 0;
        baricentro_y = 0;
    }
}

function seguindo_lider() {
    peixe_lider = gObjetos[0];
    [x_lider, y_lider] = peixe_lider.pos;
    [vx_lider, vy_lider] = peixe_lider.vel;

    for (var i = 1; i < gObjetos.length; i++) {
        peixe = gObjetos[i];
        [x, y] = peixe.pos;
        [vx, vy] = peixe.vel;

        peixe.atualiza_comando((x_lider - x)*0.015, (y_lider - y)*0.015);
        peixe.atualiza_comando((vx_lider-vx)*0.015, (vy_lider-vy)*0.015);
    }
}

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

    //Seta o intervalo de atualização para zero quando a animação for pausada e para 50ms uma vez quando 's' é pressionado
    if (!interface.animacao) {
        if (interface.passo) {
            delta = 0.05;
            interface.passo = false;
        }
        else {
            delta = 0;
        }
    };

    if (delta != 0) {
        var raio_influencia = 70;
        separacao(40)
        alinhamento(150);
        coesao(150);
        seguindo_lider();
    }

    //Recomputa vértices para todo objeto
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
        if (e.keyCode == '38') {
            peixe_lider.atualiza_comando(vx*0.2, vy*0.2);
        }

        //Diminui a velocidade na direção da cabeça do peixe em 10%
        if (e.keyCode == '40') {
            peixe_lider.atualiza_comando(-vx*0.2, -vy*0.2);
        }

        //Vira a cabeça do peixe 15 graus no sentido anti-horário
        if (e.keyCode == '37') {
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
        if (e.keyCode == '39') {
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

        //Ativa um passo na animação
        if (e.key == 's' || e.key == 'S') {
            if(!interface.animacao) {
                interface.passo = true;
            }
        }

        //Cria peixe de cardume
        if(e.key == '+') {
            //Posição 1 a 799
            x = Math.floor(Math.random()*(gCanvas.width - 1)) + 1;
            y = Math.floor(Math.random()*(gCanvas.height - 1)) + 1;

            //Velocidade 100 a 400
            vx = Math.floor(Math.random()*(gCanvas.width/2)) + 100;
            vy = Math.floor(Math.random()*(gCanvas.height/2)) + 100;
            
            gObjetos.push(new Peixe(x, y, 20, vx, vy, cor_cardume));
        }

        //Deleta peixe de cardume
        if(e.key == '-') {
            if (gObjetos.length > 1) {
                gObjetos.pop();
            }
        }
    }

    //Atualiza variável de controle em interface para não permitir segurar botão e garantir que shift não conta como botão pressionado
    if(!e.shiftKey) {
        interface.apertado = true;
    }
}

//Evento de desapertar o botão do teclado
function callback_keyboard_up(e) {
    
    //Atualiza variável de controle em interface para desapertar o botão e permitir pressionar o próximo comando 
    interface.apertado = false;
}