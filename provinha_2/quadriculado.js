function sorteie_inteiro (min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
}

function sorteie_corRGB () {
    let r = sorteie_inteiro(0, 255);
    let g = sorteie_inteiro(0, 255);
    let b = sorteie_inteiro(0, 255);
    return `rgb( ${r}, ${g}, ${b} )`;  // retorna uma string
}

function draw_random_grid() {
    let canvas = document.getElementById('test');
    let ctx = canvas.getContext('2d');
    if (!ctx) {
        alert("Your browser does not support canvas!");
    }

    let min = 0;
    let max = 255;
    let grid_num_x = canvas.width/10;
    let grid_num_y = canvas.height/10;
    let grid_list = [];
    while(grid_list.length < 50) {
        let r = Math.floor(Math.random() * 100);
        if (!grid_list.includes(r)) {
            grid_list.push(r);
        }
    }
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            if (!grid_list.includes(10*i + j)) {
                continue;
            }
            else {
                ctx.fillStyle = sorteie_corRGB();
                ctx.fillRect(grid_num_x*i, grid_num_y*j, grid_num_x, grid_num_y);
            }
        }
    }
}

function clear_canvas() {
    let canvas = document.getElementById('test');
    let ctx = canvas.getContext('2d');
    if (!ctx) {
        alert("Your browser does not support canvas!");
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}