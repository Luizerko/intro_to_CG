/*
    EP02 de MAC0420/MAC5744 - Simulação de movimento coletivo

    Nome: Luis Vitor Zerkowski
    NUSP: 9837201
 */

//Definição de constantes e variáveis globais
const FUNDO = [0, 0.41, 0.58, 1];
const cor_lider = vec4(0.3, 0.9, 0.4, 1);
const cor_cardume = vec4(1, 0.62, 0, 1);
const cor_coral = vec4(0.97, 0.49, 0.44, 1);

var gl;
var gCanvas;
var gShader = {};

var gPosicoes = [];
var gCores = [];
var gObjetos = [];
var gObstaculos = [];
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

    //Função de atualização de velocidade do peixe
    this.atualiza_comando = function(delta_vx, delta_vy) {
        this.vel = add(this.vel, vec2(delta_vx, delta_vy));
    }
};

//Função vista em aula para aproximar desenho de objeto circular com triângulos
function aproxima_disco(raio, ref=6) {
    let vertices = [
        vec2(raio, 0),
        vec2(0, raio),
        vec2(-raio, 0),
        vec2(0, -raio),
      ];
    
      for (let i = 1; i < ref; i++) {
        let novo = [];
        let nv = vertices.length;

        for (let j = 0; j < nv; j++) {
          novo.push(vertices[j]);
          
          let k = (j + 1) % nv;

          let v0 = vertices[j];
          let v1 = vertices[k];
          let m = mix(v0, v1, 0.5);

          let s = raio / length(m);
          
          m = mult(s, m)

          novo.push(m);
        }

        vertices = novo;
      }

      return vertices;
}

//Classe de obstáculos
function Obstaculo(x, y, raio, cor) {
    //Define centro do obstaculo, raio e vértices dado pela função de aproximar discos
    this.pos = vec2(x, y);
    this.raio = raio;
    this.vertices = aproxima_disco(raio);

    //Adiciona vértices e cores para esses vértices
    let nv = this.vertices.length;
    for (let i = 0; i < nv; i++) {
        let k = (i + 1) % nv;
        gPosicoes.push(this.pos);
        gPosicoes.push(add(this.pos, this.vertices[i]));
        gPosicoes.push(add(this.pos, this.vertices[k]));

        gCores.push(cor);
        gCores.push(cor);
        gCores.push(cor);
    }

    //Função que readiciona vértices de obstáculos uma vez que estamos sempre limpando o buffer de posições para redesenho
    this.redesenha_vertices = function () {
        let nv = this.vertices.length;
        for (let i = 0; i < nv; i++) {
            let k = (i + 1) % nv;
            gPosicoes.push(this.pos);
            gPosicoes.push(add(this.pos, this.vertices[i]));
            gPosicoes.push(add(this.pos, this.vertices[k]));
        }
    }
}

//Função de desvio de obstáculo. Funcionamento análogo à função de separação, mas computa o vetor de distância para cada obstáculo, não o vetor médio.
//Esse vetor tem um fator de ajuste numa função (X/log(distância*Y))^K + Z para garantir que boids mais próximos do obstáculo, e portanto com
//magnitudes de vetor de distância menores, sejam mais influenciados pelo obstaculo, mas sem exageros na atualização de velocidades.
function desvia_obstaculos() {
    //Iteração por boids
    for (var i = 0; i < gObjetos.length; i++) {
        peixe = gObjetos[i];
        [x, y] = peixe.pos;
        [vx, vy] = peixe.vel;

        //Iteração por objetos
        for (var j = 0; j < gObstaculos.length; j++) {
            obstaculo = gObstaculos[j];
            [x_obs, y_obs] = obstaculo.pos;

            //Cômputo do vetor de distância
            var dist_vec = vec2(x - x_obs, y - y_obs);
            var dist = length(dist_vec);

            //Teste de raio de influência e atualização da média dos vetores de distância. Note que o raio de influencia de um objeto é seu raio + 20
            if (obstaculo.raio+20 > dist) {

                //Tratamento de caso particular em que boids estão muito próximos, distância quase nula, para garantir magnitude mínima de vetor
                //de distância
                if (dist < 2) {
                    dist_vec = vec2(10, 10);
                }

                //Atualização da velocidade do peixe dentro do raio de influencia de um obstáculo
                peixe.atualiza_comando(dist_vec[0]*((Math.pow(2/Math.log(dist)), 3)+1), dist_vec[1]*((Math.pow(2/Math.log(dist)), 3)+1));
            }
        }
    }

}

//Função de separação entre boids. Para cada boid, o vetor de distância médio (boid_selecionado - boid_raio_influencia) dentro do raio de
//influência é calculado. Esse vetor tem um fator de ajuste numa função X/log(distância*Y) + Z para garantir que boids mais próximos, e portanto com
//magnitudes de vetor de distância menores, influenciem mais a separação com outro boid, mas sem exageros na atualização de velocidades. O boid
//em questão, por fim, tem sua velocidade atualizada para afastar-se dos boids em seu raio de influência, mantendo a fomração grupal com espaço
//individual para cada peixe
function separacao(raio_influencia) {
    var num_atualiza = 0;
    var soma_atualiza = vec2(0, 0);

    //Iteração por boids
    for (var i = 1; i < gObjetos.length; i++) {
        peixe = gObjetos[i];
        [x, y] = peixe.pos;
        [vx, vy] = peixe.vel;

        //Iteração por todos os outros boids para cada peixe selecionado. Note que a separação também separa os boids do líder, diferente dos outros
        //comportamentos
        for (var j = 0; j < gObjetos.length; j++) {
            if (j != i) {
                peixe_aux = gObjetos[j];
                [x_aux, y_aux] = peixe_aux.pos;
                [vx_aux, vy_aux] = peixe_aux.vel;

                //Cômputo do vetor de distância
                var dist_vec = vec2(x - x_aux, y - y_aux);
                var dist = length(dist_vec);

                //Teste de raio de influência e atualização da média dos vetores de distância
                if (dist <= raio_influencia) {
                    
                    //Tratamento de caso particular em que boids estão muito próximos, distância quase nula, para garantir magnitude mínima de vetor
                    //de distância
                    num_atualiza += 1;
                    if (dist < 2) {
                        dist_vec = vec2(5, 5);
                    }

                    //Atualização da média dos vetores de distância com fatores de ajuste
                    soma_atualiza = add(soma_atualiza, mult(3/Math.log(dist*1000)+1, dist_vec));
                }
            }
        }

        //Atualização da velocidade do boid influenciado por outros boids dentro do raio de influência
        if (num_atualiza != 0) {
            [delta_x, delta_y] = mult(1/num_atualiza, soma_atualiza);
            peixe.atualiza_comando(delta_x, delta_y);
        }
        num_atualiza = 0;
        soma_atualiza = vec2(0, 0);
    }
}

//Função de alinhamento entre boids. Para cada boid, a velocidade média de todos os outros boids do cardume dentro do raio de influência é calculada.
//O boid em questão tem sua velocidade atualizada para aproximar-se da velocidade dos boids em seu raio de influência, alinhando a direção e sentido
// de navegação
function alinhamento(raio_influencia) {
    var soma_velocidade = 0;
    var velocidade_x = 0;
    var velocidade_y = 0;

    //Iteração por boids
    for (var i = 1; i < gObjetos.length; i++) {
        peixe = gObjetos[i];
        [x, y] = peixe.pos;
        [vx, vy] = peixe.vel;

        //Iteração por todos os outros boids para cada peixe selecionado
        for (var j = 1; j < gObjetos.length; j++) {
            if (j != i) {
                peixe_aux = gObjetos[j];
                [x_aux, y_aux] = peixe_aux.pos;
                [vx_aux, vy_aux] = peixe_aux.vel;

                var dist = Math.sqrt(Math.pow(x - x_aux, 2) + Math.pow(y - y_aux, 2));

                //Teste de raio de influência e atualização da velocidade média
                if (dist <= raio_influencia) {
                    soma_velocidade = soma_velocidade + 1;
                    velocidade_x = velocidade_x + vx_aux;
                    velocidade_y = velocidade_y + vy_aux;
                }
            }
        }

        //Atualização da velocidade do boid influenciado por outros boids dentro do raio de influência
        if (soma_velocidade != 0) {
            peixe.atualiza_comando((velocidade_x/soma_velocidade-vx)*0.02, (velocidade_y/soma_velocidade-vy)*0.02)
        }
        soma_velocidade = 0;
        velocidade_x = 0;
        velocidade_y = 0;
    }

}

//Função de coesão entre boids. Para cada boid, o baricentro de todos os outros boids de cardume dentro do raio de influência é calculado.
//O boid em questão tem sua velocidade atualizada para aproximar-se do baricentro dos boids em seu raio de influência
function coesao(raio_influencia) {
    var soma_baricentro = 0;
    var baricentro_x = 0;
    var baricentro_y = 0;
    
    //Iteração por boids
    for (var i = 1; i < gObjetos.length; i++) {
        peixe = gObjetos[i];
        [x, y] = peixe.pos;
        [vx, vy] = peixe.vel;

        //Iteração por todos os outros boids para cada peixe selecionado
        for (var j = 1; j < gObjetos.length; j++) {
            if (j != i) {
                peixe_aux = gObjetos[j];
                [x_aux, y_aux] = peixe_aux.pos;
                [vx_aux, vy_aux] = peixe_aux.vel;

                var dist = Math.sqrt(Math.pow(x - x_aux, 2) + Math.pow(y - y_aux, 2));

                //Teste de raio de influência e atualização do baricentro
                if (dist <= raio_influencia) {
                    soma_baricentro = soma_baricentro + 1;
                    baricentro_x = baricentro_x + x_aux;
                    baricentro_y = baricentro_y + y_aux;
                }
            }
        }
        
        //Atualização da velocidade do boid influenciado por outros boids dentro do raio de influência
        if (soma_baricentro != 0) {
            peixe.atualiza_comando((baricentro_x/soma_baricentro-x)*0.02, (baricentro_y/soma_baricentro-y)*0.02)
        }
        soma_baricentro = 0;
        baricentro_x = 0;
        baricentro_y = 0;
    }
}

//Função para reger grupo de boids. Atualização de velocidade dos boids do cardume para aproximação do líder (coesão com o líder)
// e para correspondência de velocidade (alinhamento com o líder)
function seguindo_lider() {
    peixe_lider = gObjetos[0];
    [x_lider, y_lider] = peixe_lider.pos;
    [vx_lider, vy_lider] = peixe_lider.vel;

    for (var i = 1; i < gObjetos.length; i++) {
        peixe = gObjetos[i];
        [x, y] = peixe.pos;
        [vx, vy] = peixe.vel;

        peixe.atualiza_comando((x_lider - x)*0.01, (y_lider - y)*0.01);
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
    gShader.bufCores = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gShader.bufCores);
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

    //Computa comportamentos de cardume e atualiza velocidades de cada peixe. Note que funções de comportamento
    //podem ter raios de influencia diferentes
    if (delta != 0) {
        desvia_obstaculos();
        separacao(30)
        alinhamento(80);
        coesao(80);
        seguindo_lider();
    }

    //Recomputa vértices para todo objeto
    gPosicoes = [];

    //Peixe líder
    gObjetos[0].atualiza_tempo(delta);

    //Obstáculos
    for (let i = 0; i < gObstaculos.length; i++)
      gObstaculos[i].redesenha_vertices();

    //Boids de cardume
    for (let i = 1; i < gObjetos.length; i++)
      gObjetos[i].atualiza_tempo(delta);
  
    //Atualiza o buffer de vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, gShader.bufPosicoes);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(gPosicoes), gl.STATIC_DRAW);

    //Atualiza o buffer de cores
    gl.bindBuffer(gl.ARRAY_BUFFER, gShader.bufCores);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(gCores), gl.STATIC_DRAW);
  
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
    gObjetos.push(new Peixe(400, 400, 25, gCanvas.width/2, gCanvas.height/4, cor_lider));

    //Cria de 1 a 6 obstaculos no mapa
    var num_obs = Math.floor(Math.random()*6 + 1);
    //num_obs = 0;
    for (var i = 0; i < num_obs; i++) {
        //Sorteia raio do obstáculo, mínimo 20 e máximo 80, e sorteia posição de obstáculos no mapa limitando seu posicionamento pelo
        //raio de influencia do obstaculo, raio+30.
        var raio = Math.floor(Math.random()*61 + 20);
        var x = Math.floor(Math.random()*(gCanvas.width-2*(raio+20)) + (raio+20));
        var y = Math.floor(Math.random()*(gCanvas.height-2*(raio+20)) + (raio+20));

        //Cria obstáculos
        gObstaculos.push(new Obstaculo(x, y, raio, cor_coral));
    }

  
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
        
        //Aumenta a velocidade na direção da cabeça do peixe em 10% quando up_arrow é pressionado
        if (e.keyCode == '38') {
            peixe_lider.atualiza_comando(vx*0.2, vy*0.2);
        }

        //Diminui a velocidade na direção da cabeça do peixe em 10% quando down_arrow é pressionado
        if (e.keyCode == '40') {
            peixe_lider.atualiza_comando(-vx*0.2, -vy*0.2);
        }

        //Vira a cabeça do peixe 15 graus no sentido anti-horário quando left_arrow é pressionado
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

        //Vira a cabeça do peixe 15 graus no sentido horário quando right_arrow é pressionado
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
            
            gObjetos.push(new Peixe(x, y, 25, vx, vy, cor_cardume));
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