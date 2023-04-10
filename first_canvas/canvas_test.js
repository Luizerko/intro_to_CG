function draw() {
    let canvas = document.getElementById('test');
    let ctx = canvas.getContext('2d');
    if (!ctx) {
        alert("Your browser does not support canvas!")
    }
    
    //Drawing rectangles
    ctx.strokeStyle = "rgba(200, 0, 0, 1)";
    ctx.strokeRect (10, 10, 55, 50);

    ctx.fillStyle = "rgba(0, 0, 200, 0.5)";
    ctx.fillRect (30, 30, 55, 50);

    //Drawing dynamic polygons
    let points = [[20, 40], [180, 120], [180, 40], [20, 120]];
    draw_polygon(points, "rgba(0, 200, 0, 1)", 3, ctx);

    points.push( [100, 60] ); 
    points.push( [800, 60] ); 
    points.push( [800, 340] );
    draw_polygon(points, "rgba(200, 100, 0, 1)", 3, ctx);

    //Drawing text
    draw_text("This is an experimental text", 500, 600, 36, 'magenta', ctx);
}

function draw_polygon(pts, color='red', line_width=2, ctx) {
    let poli = new Path2D();
    poli.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
        poli.lineTo(pts[i][0], pts[i][1]);
    }
    poli.closePath();

    ctx.strokeStyle = 'black';
    ctx.lineWidth = line_width;
    ctx.stroke(poli);
    ctx.fillStyle = color;
    ctx.fill( poli );
}

function draw_text(text, x, y, size, color, ctx) {
    ctx.fillStyle = color;
    ctx.font = `${size}px serif`;  
    ctx.fillText(text, x, y);
}