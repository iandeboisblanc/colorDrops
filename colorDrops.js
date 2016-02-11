//settings
var settings = {
  colorStep: 50,
  airResistance: 0,  //between 0 and 1, for velocity loss
  wallLoss: 0.05,    //between 0 and 1, for vel loss on wall hit
  collisionLoss: 0.1, //between 0 and 1, for vel loss on other drop hit    
  stepTime: 5,
  G: 0.01,
  width: window.innerWidth - 40,
  height: window.innerHeight - 40,
}

//variables to hold data
var drops = [];
var collisions = {};

//helpful things
var random = Math.random;
var max = Math.max;
var min = Math.min;
var floor = Math.floor;
var sqrt = Math.sqrt;
var pow = Math.pow;
var sin = Math.sin;
var cos = Math.cos;
var atan = Math.atan;
var log10 = Math.log10;

var findDistance = function(pos1, pos2) {
  return sqrt(pow(pos2.x - pos1.x, 2) + pow(pos2.y - pos1.y, 2));
}
var limitPositions = function(x,y,r) {
  x = max(r, min(x, (settings.width - r)));
  y = max(r, min(y, (settings.height - r)));
  return [x,y];
}

//enables drag functionality on circles
var drag = d3.behavior.drag()
    .on("drag", function(d,i) {
      d.beingDragged = true;
      var x = d3.event.x;
      var y = d3.event.y;
      var xy = limitPositions(x, y, d.radius);
      d.velocity.x = (xy[0] - d.position.x) / settings.stepTime * 2.5;
      d.velocity.y = (xy[1] - d.position.y) / settings.stepTime * 2.5;
      d.position.x = xy[0];
      d.position.y = xy[1];
      //edit velocities
      d3.select(this)
        .attr("cx", d.position.x)
        .attr("cy", d.position.y);
    })
    .on('dragend', function(d) {
      d.beingDragged = false;
    });

//start everything going!
init();

//functions:
function init() {
  createBoard();
  createDropsData();
  generateDrops();
  setInterval(function() {
    applyGravity();
    detectCollisions();
    updateDropPositions();
  }, settings.stepTime);
d3.select(window).on('resize', resize);
}

function createBoard() {
  d3.select('body').selectAll('svg')
    .data([{width:settings.width, height:settings.height}])
    .enter()
    .append('svg')
    .attr('class', 'board')
    .attr('width', settings.width)
    .attr('height', settings.height);
}

function createDropsData() {
  var possibleStartingPositions = [];
  for(var a = 10; a < settings.width - 10; a+=20) {
    for(var b = 10; b < settings.height - 10; b+=20) {
      possibleStartingPositions.push([a,b]);
    }
  }
  debugger;
  for(var i = 0; i <= 255; i+= settings.colorStep) {
    for(var j = 0; j <= 255; j += settings.colorStep) {
      for(var k = 0; k <= 255; k+= settings.colorStep) {
        var dropData = {
          position: {},
          velocity: {},
          radius: 10,
          color: {r:i, g:j, b:k},
          beingDragged: false
        };
        var positionIndex = floor(random() * possibleStartingPositions.length);
        var position = possibleStartingPositions.splice(positionIndex, 1)[0];
        dropData.position.x = position[0];
        dropData.position.y = position[1];
        dropData.velocity.x = 0; 
        dropData.velocity.y = 0;
        drops.push(dropData);
      }
    }
  }
}

function generateDrops() {
  d3.select('.board').selectAll('circle')
    .data(drops)
    .enter()
    .append('circle')
    .attr('cx', function(d) {
      return d.position.x;
    })
    .attr('cy', function(d) {
      return d.position.y;
    })
    .attr('r', function(d) {
      return d.radius;
    })
    .attr('fill', function(d) {
      return 'rgb(' + d.color.r + ',' + d.color.g + ',' + d.color.b + ')';
    })
    .attr('stroke', function(d) {
      return 'rgba(' + d.color.r + ',' + d.color.g + ',' + d.color.b + ', 0.5)';
    })
    .call(drag);
}

function applyGravity() {
  for(var i = 0; i < drops.length; i++) {
    var drop1 = drops[i];
    var xForceTot = 0;
    var yForceTot = 0;
    for(var j = 0; j < drops.length; j++) {
      var drop2 = drops[j];
      var dX = drop2.position.x - drop1.position.x;
      var dY = drop2.position.y - drop1.position.y;
      if(dX === 0 || dY === 0) {
        var xForce = 0;
        var yForce = 0;
      } else {
        var xForce = settings.G * drop2.radius * drop1.radius / 
          max(pow(dX, 2), pow(drop1.radius + drop2.radius, 2)) * (dX > 0 ? 1 : -1);
        var yForce = settings.G * drop2.radius * drop1.radius / 
          max(pow(dY, 2), pow(drop1.radius + drop2.radius, 2)) * (dY > 0 ? 1 : -1);
      }
      xForceTot += xForce;
      yForceTot += yForce;
    }
    var dVx = xForceTot / drop1.radius;
    var dVy = yForceTot / drop1.radius;
    if(!drop1.beingDragged) {
      drop1.velocity.x += dVx;
      drop1.velocity.y += dVy;
    } 
  }
}

function detectCollisions() {
  for(var i = 0; i < drops.length; i++) {
    var drop1 = drops[i];
    for(var j = i + 1; j < drops.length; j++) {
      var drop2 = drops[j];
      if(findDistance(drop1.position, drop2.position) <= drop1.radius + drop2.radius) {
        //collision!
        if(collisions['' + i + j]) {
          var time = new Date().getTime() - collisions['' + i + j];
          if(time > 10000) {
            //merge
            console.log('Merging', i, j);
          }
        } else {
          collisions['' + i + j] = new Date().getTime();
        }
        var dX = drop2.position.x - drop1.position.x;
        var dY = drop2.position.y - drop1.position.y;
        if(dX === 0) {
          var theta = Math.PI;
        }
        else {
          var theta = atan(dY / dX);
        }
        var tempVX = drop1.velocity.x;
        var tempVY = drop1.velocity.y;
        drop1.velocity.x = drop2.velocity.x;
        drop1.velocity.y = drop2.velocity.y;
        drop2.velocity.x = tempVX;
        drop2.velocity.y = tempVY;
      } else {
        if(collisions['' + i + j]) {
          //end of collision
          collisions['' + i + j] = undefined;
        }
      }
    }
  }
}

function updateDropPositions() {
  for(var i = 0; i < drops.length; i++) {
    var drop = drops[i];
    if(!(drop.beingDragged)){
      drop.position.x += drop.velocity.x;
      if(drop.position.x <= drop.radius || drop.position.x >= settings.width - drop.radius) {
        drop.position.x = limitPositions(drop.position.x,1,drop.radius)[0];
        drop.velocity.x = (settings.wallLoss - 1) * drop.velocity.x;
      }
      drop.position.y += drop.velocity.y;
      if(drop.position.y <= drop.radius || drop.position.y >= settings.height - drop.radius) {
        drop.position.y = limitPositions(1,drop.position.y,drop.radius)[1];
        drop.velocity.y = (settings.wallLoss - 1) * drop.velocity.y;
      }
      drop.velocity.x *= 1 - (settings.airResistance);
      drop.velocity.y *= 1 - (settings.airResistance);
    }
  }
  d3.select('.board').selectAll('circle')
    .data(drops)
    .attr('cx', function(d) {
      return d.position.x;
    })
    .attr('cy', function(d) {
      return d.position.y;
    });
}

function resize() {
  settings.width = window.innerWidth - 40;
  settings.height = window.innerHeight - 40;
  d3.select('svg')
    .attr('width', settings.width)
    .attr('height', settings.height);
}


