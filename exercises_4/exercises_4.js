function draw_circle() {
    let canvas = document.getElementById('test');
    let ctx = canvas.getContext('2d');
    if (!ctx) {
        alert("Your browser does not support canvas!");
    }
    
    let center = [[canvas.width/2 - 1, canvas.height/2 - 1]];
    let seg_num = 8;
    let radius = 100;
    let angle = 2*Math.PI/seg_num;
    let cur_angle = 0;
    points = [];
    for (let i = 0; i <= seg_num; i++) {
        points.push([center[0][0] + Math.cos(cur_angle)*radius, center[0][1] + Math.sin(cur_angle)*radius]);
        cur_angle = cur_angle + angle;
    }

    let poli = new Path2D();
    poli.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        poli.lineTo(points[i][0], points[i][1]);
    }
    poli.closePath();

    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 3;
    ctx.stroke(poli);
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
    for (let i = 0; i < grid_num_x; i++) {
        for (let j = 0; j < grid_num_y; j++) {
            if (Math.floor(Math.random()*2) == 0) {
                continue;
            }
            else {
                let r = Math.floor(Math.random() * (max - min) ) + min;
                let g = Math.floor(Math.random() * (max - min) ) + min;
                let b = Math.floor(Math.random() * (max - min) ) + min;
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
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