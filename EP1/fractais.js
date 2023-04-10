//EP1 MAC0420 - Introdução a Computação Gráfica
//Aluno: Luis Vitor Zerkowski - 9837201

const MAX_ITER = 100;
const LIM_MANDEL = 4;

var ctx, canvas;
var interface = {
    shift_pressed: false,
    mouse_pressed: false,
    mouse_x: 0,
    mouse_y: 0,
    mandel_begin_x: -2.2,
    mandel_end_x: 0.8,
    mandel_begin_y: -1.5,
    mandel_end_y: 1.5,
}

window.onload = main;

function main() {
    
    //Selecionando o elemento do canvas e preparando o contexto para desenho
    canvas = document.getElementById("fractais_canvas");
    ctx = canvas.getContext('2d');
    if (!ctx) { alert("Sem canvas pra você :("); }

    //Desenhando as condições iniciais
    let c = [-0.62, -0.44];
    draw_julia(c);
    draw_mandelbrot(-2.2, 0.8, -1.5, 1.5);

    //Construindo evento de clique para alteração do conjunto Julia-Fatou
    canvas.addEventListener('click', callback_new_c);

    //Construindo eventos de teclado
    window.addEventListener('keydown', callback_keyboard);
    window.addEventListener('keyup', callback_keyboard_shift_up);

    //Construindo evento de zoom no conjunto Mandelbrot
    window.addEventListener('mousedown', callback_mouse_down);
    window.addEventListener('mousemove', callback_mouse_move);
    window.addEventListener('mouseup', callback_mouse_up);

}

//Desenhando o conjunto Julia-Fatou
function draw_julia(c) {
    
    //Mapeando os pixels no plano complexo
    // (0, height/2) -> (-1.5, -1.5)
    // (width, height) -> (1.5, 1.5)
    let julia_delta_w = 3.0/canvas.width;
    let julia_delta_h = 3.0/(canvas.height/2);
    let julia_pix_x = 0; let julia_x = -1.5;
    let julia_pix_y = Math.floor(canvas.height/2); let julia_y = -1.5;

    //Iterando por todo o plano e consteruindo o fractal
    while (julia_pix_x < canvas.width) {

        while (julia_pix_y < canvas.height) {

            let z = [julia_x, julia_y];
            let converge = false;

            for (let i = 0; i < MAX_ITER; i++) {

                if (z[0]*z[0] + z[1]*z[1] >= 4) {
                    converge = true;
                    break;
                }

                let new_z0 = z[0]*z[0] - z[1]*z[1] + c[0];
                let new_z1 = 2*z[0]*z[1] + c[1];

                z[0] = new_z0;
                z[1] = new_z1;

            }

            if (converge) {
                ctx.fillStyle = 'black';
                ctx.fillRect(julia_pix_x, julia_pix_y, 1, 1);
            }
            else {
                ctx.fillStyle = 'blue';
                ctx.fillRect(julia_pix_x, julia_pix_y, 1, 1);
            }

            julia_pix_y += 1;
            julia_y += julia_delta_h;

        }

        julia_pix_y = Math.floor(canvas.height/2);
        julia_y = -1.5;

        julia_pix_x += 1;
        julia_x += julia_delta_w;

    }

}

//Desenhando o conjunto Mandelbrot
function draw_mandelbrot(begin_x, end_x, begin_y, end_y) {
    
    //Mapeando os pixels no plano complexo
    // (0, 0) -> (-2.2, -1.5)
    // (width, height/2) -> (0.8, 1.5)
    let mandel_delta_w = (end_x - begin_x)/canvas.width;
    let mandel_delta_h = (end_y - begin_y)/(canvas.height/2);
    let mandel_pix_x = 0; let mandel_x = begin_x;
    let mandel_pix_y = 0; let mandel_y = begin_y;

    //Definindo mapa de cores
    let NCORES = 9;
    let CORES = ['black', 'red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet', 'brown', 'gray'];

    //Iterando por todo o plano e consteruindo o fractal
    while (mandel_pix_x < canvas.width) {

        while (mandel_pix_y < Math.floor(canvas.height/2)) {

            let z = [0, 0];
            let converge = true;
            let k = 0;

            for (let i = 0; i < MAX_ITER; i++) {

                let d = [mandel_x, mandel_y];

                let new_z0 = z[0]*z[0] - z[1]*z[1] + d[0];
                let new_z1 = 2*z[0]*z[1] + d[1];

                z[0] = new_z0;
                z[1] = new_z1;

                if (z[0]*z[0] + z[1]*z[1] >= LIM_MANDEL) {
                    converge = false;
                    k = i;
                    break;
                }

            }

            ctx.fillStyle = CORES[k % NCORES];
            ctx.fillRect(mandel_pix_x, mandel_pix_y, 1, 1);

            mandel_pix_y += 1;
            mandel_y += mandel_delta_h;

        }

        mandel_pix_y = 0;
        mandel_y = begin_y;

        mandel_pix_x += 1;
        mandel_x += mandel_delta_w;

    }

}

//Função de callback para redesenho de Julia-Fatou
function callback_new_c(e) {
    
    if (e.offsetY < Math.floor(canvas.height/2)) {
        
        //Computando novo parâmetro c a ser usado para desenhar o conjunto Julia-Fatou
        let mandel_delta_w = (interface.mandel_end_x - interface.mandel_begin_x)/canvas.width;
        let mandel_delta_h = (interface.mandel_end_y - interface.mandel_begin_y)/(canvas.height/2);
        let c = [interface.mandel_begin_x + e.offsetX*mandel_delta_w, interface.mandel_begin_y + e.offsetY*mandel_delta_h]
        draw_julia(c)

    }

}

//Função de callback para comandos do teclado
function callback_keyboard(e) {
    
    //Botão de reset
    if (e.key === 'r' || e.key === 'R') {

        let c = [-0.62, -0.44];
        draw_julia(c);
        draw_mandelbrot(-2.2, 0.8, -1.5, 1.5);

        //Resetando coordenadas da variável de interface
        interface.mandel_begin_x = -2.2;
        interface.mandel_end_x = 0.8;
        interface.mandel_begin_y = -1.5;
        interface.mandel_end_y = 1.5;

    }

    //Apertando shift
    if (e.key === 'Shift') {
        interface.shift_pressed = true;
    }

}

//Função de callback para desarme do botão 'shift' através da variável de interface
function callback_keyboard_shift_up(e) {
    
    //Desapertando shift
    if (e.key === 'Shift') {
        interface.shift_pressed = false;
    }

}

//Função de callback para capturar posição inicial do clique do mouse
function callback_mouse_down(e) {

    if (interface.shift_pressed) {

        //Apertando o mouse junto com o Shift e salvando as posições iniciais do clique
        interface.mouse_pressed = true;
        interface.mouse_x = e.offsetX;
        interface.mouse_y = e.offsetY;

    }

}

//Função de callback para capturar movimento do mouse quando clicado junto com Shift
function callback_mouse_move(e) {

    if (interface.mouse_pressed) {

        //Limpando metade de cima do canvas e redesenhando para poder deixar o comando de Shift + clique interativo
        ctx.clearRect(0, 0, canvas.width, Math.floor(canvas.height/2));
        draw_mandelbrot(interface.mandel_begin_x, interface.mandel_end_x, interface.mandel_begin_y, interface.mandel_end_y);

        //Desenhando retângulo interativo para deixar mais claro o comando de Shift + clique
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = 'white';
        ctx.strokeRect(interface.mouse_x, interface.mouse_y, e.offsetX - interface.mouse_x , e.offsetY - interface.mouse_y);

    }
    
}

//Função de callback para finalizar clique de mouse junto com Shift e dar o devido zoom
function callback_mouse_up(e) {

    if (interface.mouse_pressed) {
        
        //Desapertando mouse
        interface.mouse_pressed = false;

        //Computando atual escala do conjunto Mandelbrot para cômputo correto de novos intervalos em X e Y
        let mandel_delta_w = (interface.mandel_end_x - interface.mandel_begin_x)/canvas.width;
        let mandel_delta_h = (interface.mandel_end_y - interface.mandel_begin_y)/(canvas.height/2);
        
        //Ajustando intervalo em X a depender da posição final do mouse - à direita ou à esquerda do clique inicial
        if (e.offsetX > interface.mouse_x) { 
            
            interface.mandel_end_x = interface.mandel_begin_x + e.offsetX*mandel_delta_w; 
            interface.mandel_begin_x = interface.mandel_begin_x + interface.mouse_x*mandel_delta_w;

        }
        else { 
            
            interface.mandel_end_x = interface.mandel_begin_x + interface.mouse_x*mandel_delta_w;
            interface.mandel_begin_x = interface.mandel_begin_x + e.offsetX*mandel_delta_w;

        }

        //Ajustando intervalo em Y a depender da posição final do mouse - acima ou abaixo do clique inicial
        if (e.offsetY > interface.mouse_y) { 
            
            interface.mandel_end_y = interface.mandel_begin_y + e.offsetY*mandel_delta_h; 
            interface.mandel_begin_y = interface.mandel_begin_y + interface.mouse_y*mandel_delta_h;

        }
        else { 
            
            interface.mandel_end_y = interface.mandel_begin_y + interface.mouse_y*mandel_delta_h;
            interface.mandel_begin_y = interface.mandel_begin_y + e.offsetY*mandel_delta_h;

        }

        //Limpando metade de cima do canvas e redesenhando conjunto Mandelbrot nos novos intervalos em X e Y
        ctx.clearRect(0, 0, canvas.width, Math.floor(canvas.height/2));
        draw_mandelbrot(interface.mandel_begin_x, interface.mandel_end_x, interface.mandel_begin_y, interface.mandel_end_y);

    }
    
}