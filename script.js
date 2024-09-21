const projects = [
  { title: 'PaintSwap', description: 'The ultimate open NFT marketplace', link: 'https://paintswap.finance', width: 280, height: 150 },
  { title: 'TinySwap', description: 'Simple crypto swap and bridge', link: 'https://tinyswap.app', width: 160, height: 180 },
  { title: 'Sonic Music', description: 'Music visualizer of the Sonic network', link: 'https://music.paintoshi.dev', width: 210, height: 110 },
  { title: 'Estfor Kingdom', description: 'A play-to-earn medieval fantasy idle game', link: 'https://estfor.com', width: 280, height: 150 },
  { title: 'Auth.Cash', description: 'Web3 Account validator', link: 'https://auth.cash', width: 170, height: 170 },
  { title: 'Speed Checker', description: 'Compare the finality of different EVM networks', link: 'https://speedchecker.paintswap.io', width: 260, height: 130 },
  { title: '$BRUSH', description: 'Latest price', link: 'https://brush.paintoshi.dev', width: 140, height: 120 }
];

const isMobile = window.innerWidth <= 768;
let dragOffset = { x: 0, y: 0 };
const baseWidth = 2200;
const baseHeight = 1200;
let scale = 1;

function updateScale() {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  scale = Math.min(windowWidth / baseWidth, windowHeight / baseHeight);
}

function scaleValue(value) {
  return value * scale;
}

function createNode(project, borderColor) {
  const node = document.createElement('div');
  node.className = 'node';
  node.innerHTML = `<h2>${project.title}</h2><p>${project.description}</p>`;

  // Set dynamic styles
  const scaledWidth = scaleValue(project.width);
  const scaledHeight = scaleValue(project.height);
  const scaledBorder = scaleValue(2);
  const scaledPadding = scaleValue(12);
  node.style.width = `${scaledWidth}px`;
  node.style.height = `${scaledHeight}px`;
  node.style.border = `${scaledBorder}px solid ${borderColor}`;
  node.style.boxShadow = `0 0 ${scaleValue(20)}px ${borderColor}`;
  node.style.borderRadius = `${scaleValue(32)}px`;
  node.style.padding = `${scaledPadding}px`;
  node.dataset.borderColor = borderColor;

  // Generate a darker background color
  const darkBackgroundColor = darkenColor(borderColor, 40);
  node.style.backgroundColor = darkBackgroundColor;
  node.style.opacity = '0.9';

  // Scale font sizes
  node.style.fontSize = `${scaleValue(16)}px`;
  node.querySelector('h2').style.fontSize = `${scaleValue(24)}px`;
  node.querySelector('p').style.fontSize = `${scaleValue(16)}px`;

  // Calculate total width and height including border and padding
  const totalWidth = scaledWidth + (scaledBorder + scaledPadding) * 2;
  const totalHeight = scaledHeight + (scaledBorder + scaledPadding) * 2;

  return {
    node,
    width: totalWidth,
    height: totalHeight,
    innerWidth: scaledWidth,
    innerHeight: scaledHeight
  };
}

function getDistinctColors(n) {
  const colors = [];
  const saturation = 70; // Adjust saturation as needed
  const lightness = 50;  // Adjust lightness as needed
  // const startRotation = Math.random() * 360;
  const startRotation = 0;
  for (let i = 0; i < n; i++) {
    const hue = Math.round((360 / n) * i + startRotation);
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  return colors;
}

// Darken Color Function
function darkenColor(color, percent) {
  if (color.startsWith('hsl')) {
    const hsl = parseHSL(color);
    hsl.l = Math.max(0, hsl.l - percent);
    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  } else if (color.startsWith('#')) {
    const hsl = hexToHSL(color);
    hsl.l = Math.max(0, hsl.l - percent);
    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  } else {
    console.error('Unsupported color format in darkenColor:', color);
    return color;
  }
}

// Parse HSL Function
function parseHSL(hslString) {
  const hslParts = hslString.match(/hsl\(\s*([\d.]+),\s*([\d.]+)%?,\s*([\d.]+)%?\)/i);
  if (hslParts) {
    return {
      h: parseFloat(hslParts[1]),
      s: parseFloat(hslParts[2]),
      l: parseFloat(hslParts[3])
    };
  } else {
    console.error('Invalid HSL color string:', hslString);
    return { h: 0, s: 0, l: 0 };
  }
}

function hexToHSL(H) {
  // Convert hex to RGB first
  let r = 0, g = 0, b = 0;
  if (H.length === 7) {
    r = parseInt(H.substring(1, 3), 16) / 255;
    g = parseInt(H.substring(3, 5), 16) / 255;
    b = parseInt(H.substring(5, 7), 16) / 255;
  }
  // Then to HSL
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0));
        break;
      case g:
        h = ((b - r) / d + 2);
        break;
      case b:
        h = ((r - g) / d + 4);
        break;
    }
    h /= 6;
  }
  h = Math.round(360 * h);
  s = Math.round(100 * s);
  l = Math.round(100 * l);
  return { h, s, l };
}

let centerX, centerY, centerRadius, safeZoneRadius;
let render, engine, world, nodes;
const cursorGlow = document.createElement('div');

function handleResize() {
  const oldScale = scale;
  updateScale();
  
  if (!isMobile) {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
    render.options.width = window.innerWidth;
    render.options.height = window.innerHeight;
    Matter.Render.setPixelRatio(render, window.devicePixelRatio);

    // Update center position
    centerX = render.options.width / 2;
    centerY = render.options.height / 2;

    // Update other scaled values
    centerRadius = scaleValue(150);
    safeZoneRadius = centerRadius + scaleValue(250);

    // Only update body sizes if the scale has changed
    if (oldScale !== scale) {
      updateBodySizes();
    }

    // Calculate scale factor
    const scaleFactor = scale / oldScale;

    // Reposition and resize nodes
    nodes.forEach((body, index) => {
      const project = projects[index];
      
      // Scale position
      const newX = centerX + (body.position.x - centerX) * scaleFactor;
      const newY = centerY + (body.position.y - centerY) * scaleFactor;
      Matter.Body.setPosition(body, { x: newX, y: newY });

      // Scale velocity
      const newVelocity = Matter.Vector.mult(body.velocity, scaleFactor);
      Matter.Body.setVelocity(body, newVelocity);

      // Resize body
      const newWidth = scaleValue(project.width);
      const newHeight = scaleValue(project.height);
      Matter.Body.scale(body, newWidth / (body.bounds.max.x - body.bounds.min.x), newHeight / (body.bounds.max.y - body.bounds.min.y));

      // Resize node element
      if (body.plugin && body.plugin.node) {
        const node = body.plugin.node;
        node.style.width = `${newWidth}px`;
        node.style.height = `${newHeight}px`;
        node.style.fontSize = `${scaleValue(16)}px`;
        node.querySelector('h2').style.fontSize = `${scaleValue(24)}px`;
        node.querySelector('p').style.fontSize = `${scaleValue(16)}px`;
        node.style.borderRadius = `${scaleValue(32)}px`;
        node.style.padding = `${scaleValue(12)}px`;
      }
    });

    if (cursorGlow) {
      const cursorGlowSize = scaleValue(15);
      cursorGlow.style.width = `${cursorGlowSize}px`;
      cursorGlow.style.height = `${cursorGlowSize}px`;
    }
  } else {
    // Handle resize for mobile layout
    const network = document.getElementById('network');
    network.style.width = `${window.innerWidth}px`;
    network.style.height = `${window.innerHeight}px`;
    
    // Reposition nodes for mobile layout
    projects.forEach((project, index) => {
      const node = network.children[index];
      node.style.width = `${scaleValue(project.width)}px`;
      node.style.height = `${scaleValue(project.height)}px`;
      node.style.fontSize = `${scaleValue(16)}px`;
      node.querySelector('h2').style.fontSize = `${scaleValue(24)}px`;
      node.querySelector('p').style.fontSize = `${scaleValue(16)}px`;
      node.style.borderRadius = `${scaleValue(32)}px`;
      node.style.padding = `${scaleValue(12)}px`;
      // You may want to add specific positioning for mobile layout here
    });
  }

  // Update main title and subtitle
  updateMainTitleAndSubtitle();
}

// Calculates the overlap (or gap) between the rectangles along the x and y axes and then computes the Euclidean distance between the edges
function computeEdgeDistance(nodeA, nodeB) {
  const halfWidthA = (nodeA.bounds.max.x - nodeA.bounds.min.x) / 2;
  const halfHeightA = (nodeA.bounds.max.y - nodeA.bounds.min.y) / 2;
  const halfWidthB = (nodeB.bounds.max.x - nodeB.bounds.min.x) / 2;
  const halfHeightB = (nodeB.bounds.max.y - nodeB.bounds.min.y) / 2;

  const dx = Math.abs(nodeA.position.x - nodeB.position.x) - (halfWidthA + halfWidthB);
  const dy = Math.abs(nodeA.position.y - nodeB.position.y) - (halfHeightA + halfHeightB);

  const edgeDistanceX = Math.max(0, dx);
  const edgeDistanceY = Math.max(0, dy);

  return Math.sqrt(edgeDistanceX * edgeDistanceX + edgeDistanceY * edgeDistanceY);
}

if (isMobile) {
  const network = document.getElementById('network');
  projects.forEach(project => {
    network.appendChild(createNode(project));
  });
} else {
  const { Engine, Render, World, Bodies, Mouse, MouseConstraint, Body, Runner, Vector } = Matter;

  engine = Engine.create({
    enableSleeping: true,
    gravity: { x: 0, y: 0 },
    sleepTolerance: 0.1,
    timing: { timeScale: 1 }
  });
  world = engine.world;

  world.gravity.y = 0;

  const networkElement = document.getElementById('network');
  render = Render.create({
    element: networkElement,
    engine: engine,
    options: {
      width: networkElement.clientWidth,
      height: networkElement.clientHeight,
      wireframes: false,
      background: 'transparent'
    }
  });

  cursorGlow.id = 'cursor-glow';
  networkElement.appendChild(cursorGlow);

  Matter.use('keep-in-bounds', function(Matter) {
    return {
      name: 'keep-in-bounds',
      version: '0.1.0',
      install: function(Matter) {
        Matter.after('Engine.update', function() {
          const bodies = Matter.Composite.allBodies(engine.world);
          for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            if (body.position.x < 0) Matter.Body.setPosition(body, { x: 0, y: body.position.y });
            if (body.position.x > render.options.width) Matter.Body.setPosition(body, { x: render.options.width, y: body.position.y });
            if (body.position.y < 0) Matter.Body.setPosition(body, { x: body.position.x, y: 0 });
            if (body.position.y > render.options.height) Matter.Body.setPosition(body, { x: body.position.x, y: render.options.height });
          }
        });
      }
    };
  });

  centerX = render.options.width / 2;
  centerY = render.options.height / 2;
  centerRadius = 150;
  safeZoneRadius = centerRadius + 250;

  nodes = [];

  const colors = getDistinctColors(projects.length);

  // Set initial max node size for calculations
  let maxNodeSize = 0;

  projects.forEach((project, index) => {
    const angle = (index / projects.length) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * (safeZoneRadius + 200);
    const y = centerY + Math.sin(angle) * (safeZoneRadius + 200);
  
    const borderColor = colors[index];
    const { node, width, height, innerWidth, innerHeight } = createNode(project, borderColor);
    networkElement.appendChild(node);
  
    // Calculate node size
    const size = (width + height) / 2;
    maxNodeSize = Math.max(maxNodeSize, size);
  
    // Create a rectangle body with the total dimensions
    const body = Bodies.rectangle(x, y, width, height, {
      friction: 0.2,
      frictionAir: 0.5,
      restitution: 0.8,
      sleepThreshold: 15,
      inertia: Infinity, // Prevent rotation
      render: { visible: false },
      plugin: { node, project, size, width, height, innerWidth, innerHeight }
    });
  
    nodes.push(body);
    World.add(world, body);
  });

  function applyCustomGravity() {
    const centerPosition = Matter.Vector.create(centerX, centerY);
    const baseStrength = 0.3 * Math.pow(scale, 2);
    const minDistance = safeZoneRadius;
    const baseRepulsionStrength = 0.2 * scale;
    const baseRepulsionRange = 100 * scale;
    const MIN_FORCE_THRESHOLD = 0.001; // Define minimum force threshold
  
    for (let indexA = 0; indexA < nodes.length; indexA++) {
      const nodeA = nodes[indexA];
  
      // Attraction to Center
      const directionToCenter = Matter.Vector.sub(centerPosition, nodeA.position);
      const distanceToCenter = Matter.Vector.magnitude(directionToCenter);
  
      if (distanceToCenter > minDistance) {
        const normalizedDirection = Matter.Vector.normalise(directionToCenter);
        const strength = baseStrength * (1 - Math.min(1, minDistance / distanceToCenter));
        if (strength > MIN_FORCE_THRESHOLD) {
          const force = Matter.Vector.mult(normalizedDirection, strength);
          Matter.Body.applyForce(nodeA, nodeA.position, force);
        }
      } else {
        // Repel if too close to center
        const repelStrength = baseStrength * 0.5;
        const repelForce = Matter.Vector.mult(Matter.Vector.normalise(directionToCenter), -repelStrength);
        Matter.Body.applyForce(nodeA, nodeA.position, repelForce);
      }
  
      // Repulsion Between Nodes
      for (let indexB = indexA + 1; indexB < nodes.length; indexB++) {
        const nodeB = nodes[indexB];
  
        // Compute edge-to-edge distance
        const edgeDistance = computeEdgeDistance(nodeA, nodeB);
  
        // Adjust repulsion range based on node sizes
        const sizeA = nodeA.plugin.size;
        const sizeB = nodeB.plugin.size;
        const repulsionRangeA = baseRepulsionRange * (sizeA / maxNodeSize);
        const repulsionRangeB = baseRepulsionRange * (sizeB / maxNodeSize);
        const repulsionRangeAB = (repulsionRangeA + repulsionRangeB) / 2;
  
        if (edgeDistance < repulsionRangeAB) {
          // Compute direction and strength
          const directionBetweenNodes = Matter.Vector.sub(nodeB.position, nodeA.position);
          const normalizedDirection = Matter.Vector.normalise(directionBetweenNodes);
  
          // Use constant repulsion strength
          const repulsionStrengthAB = baseRepulsionStrength;
          const strength = repulsionStrengthAB * (1 - edgeDistance / repulsionRangeAB);
  
          if (strength > MIN_FORCE_THRESHOLD) {
            const repulsionForce = Matter.Vector.mult(normalizedDirection, -strength);
  
            Matter.Body.applyForce(nodeA, nodeA.position, repulsionForce);
            Matter.Body.applyForce(nodeB, nodeB.position, Matter.Vector.neg(repulsionForce));
          }
        }
      }
    }
  }

  function applyOpacity(color, opacity = 0.5) {
    // Check if the color is in hex format
    if (color.startsWith('#')) {
      // Convert hex to RGB
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    // Check if the color is in rgb format
    else if (color.startsWith('rgb')) {
      // Extract the RGB values
      const [r, g, b] = color.match(/\d+/g);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    // Check if the color is in hsl format
    else if (color.startsWith('hsl')) {
      // Keep the hsl format but add alpha
      return color.replace('hsl', 'hsla').replace(')', `, ${opacity})`);
    }
    // If it's none of the above, return the original color
    return color;
  }

  Matter.Events.on(engine, 'beforeUpdate', applyCustomGravity);

  const mouse = Mouse.create(render.canvas);
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.2,
      render: { visible: false }
    }
  });

  World.add(world, mouseConstraint);

  // Open link on click without significant movement
  let clickStartPosition = null;
  Matter.Events.on(mouseConstraint, 'mousedown', (event) => {
    clickStartPosition = { x: event.mouse.position.x, y: event.mouse.position.y };
  });

  Matter.Events.on(mouseConstraint, 'mouseup', (event) => {
    if (clickStartPosition) {
      const clickEndPosition = { x: event.mouse.position.x, y: event.mouse.position.y };
      const dx = clickEndPosition.x - clickStartPosition.x;
      const dy = clickEndPosition.y - clickStartPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
  
      if (distance < 5) {
        // Treat as click
        const body = Matter.Query.point(nodes, event.mouse.position)[0];
        if (body && body.plugin && body.plugin.project) {
          window.open(body.plugin.project.link, '_blank');
        }
      }
      clickStartPosition = null;
    }
  });

  // Hover effect using Matter.js mouse events
  let hoveredBody = null;
  let hoverCheckPending = false;

  Matter.Events.on(mouseConstraint, 'mousemove', function(event) {
    if (!hoverCheckPending) {
      hoverCheckPending = true;
      requestAnimationFrame(() => {
        checkHover(event);
        hoverCheckPending = false;
      });
    }
  });

  function checkHover(event) {
    const mousePosition = event.mouse.position;
    let bodyUnderMouse = null;

    // Check each node individually
    for (let i = 0; i < nodes.length; i++) {
      const body = nodes[i];
      const { x, y } = body.position;
      const { width, height } = body.plugin;
      
      // Check if the mouse is within the node's bounds
      if (mousePosition.x >= x - width / 2 && mousePosition.x <= x + width / 2 &&
          mousePosition.y >= y - height / 2 && mousePosition.y <= y + height / 2) {
        bodyUnderMouse = body;
        break;
      }
    }
  
    if (bodyUnderMouse !== hoveredBody) {
      // Remove hover effect from the previous node
      if (hoveredBody && hoveredBody.plugin && hoveredBody.plugin.node) {
        const node = hoveredBody.plugin.node;
        node.style.filter = 'brightness(1)';
        node.style.boxShadow = `0 0 ${scaleValue(20)}px ${node.dataset.borderColor}`;
      }
  
      // Apply hover effect to the new node
      if (bodyUnderMouse && bodyUnderMouse.plugin && bodyUnderMouse.plugin.node) {
        const node = bodyUnderMouse.plugin.node;
        const borderColor = node.dataset.borderColor;
        node.style.filter = 'brightness(1.2)';
        node.style.boxShadow = `0 0 ${scaleValue(30)}px ${borderColor}`;
  
        // Add glow to the cursor with boxShadow 0.5 opacity
        cursorGlow.style.boxShadow = `0 0 ${scaleValue(30)}px ${scaleValue(15)}px ${applyOpacity(borderColor, 0.4)}`;
        cursorGlow.style.background = borderColor;
        cursorGlow.classList.add('hovered');
      } else {
        cursorGlow.style.boxShadow = `0 0 ${scaleValue(30)}px ${scaleValue(15)}px rgba(255, 255, 255, 0.3)`;
        cursorGlow.style.background = 'rgba(255, 255, 255, 1)';
        cursorGlow.classList.remove('hovered');
      }
  
      hoveredBody = bodyUnderMouse;
    }
  }

  function updateBodySizes() {
    nodes.forEach((body) => {
      if (body.plugin && body.plugin.project) {
        const { node, width, height, innerWidth, innerHeight } = createNode(body.plugin.project, body.plugin.node.dataset.borderColor);
        
        // Scale the physics body
        Matter.Body.scale(body, width / body.plugin.width, height / body.plugin.height);
        
        // Update the plugin properties
        Object.assign(body.plugin, { width, height, innerWidth, innerHeight });
        
        // Update the node element styles individually
        const existingNode = body.plugin.node;
        existingNode.style.width = node.style.width;
        existingNode.style.height = node.style.height;
        existingNode.style.border = node.style.border;
        existingNode.style.boxShadow = node.style.boxShadow;
        existingNode.style.borderRadius = node.style.borderRadius;
        existingNode.style.padding = node.style.padding;
        existingNode.style.fontSize = node.style.fontSize;
        
        // Update nested elements' font sizes
        const existingH2 = existingNode.querySelector('h2');
        const existingP = existingNode.querySelector('p');
        const newH2 = node.querySelector('h2');
        const newP = node.querySelector('p');
        
        if (existingH2 && newH2) existingH2.style.fontSize = newH2.style.fontSize;
        if (existingP && newP) existingP.style.fontSize = newP.style.fontSize;
      }
    });
  }

  // Handle when the mouse leaves the canvas
  render.canvas.addEventListener('mouseleave', function() {
    if (hoveredBody && hoveredBody.plugin && hoveredBody.plugin.node) {
      const node = hoveredBody.plugin.node;
      node.style.filter = 'brightness(1)';
      node.style.boxShadow = `0 0 20px ${node.dataset.borderColor}`;
    }
    hoveredBody = null;
  
    // Reset cursor to default when mouse leaves the canvas
    // render.canvas.style.cursor = 'default';
  });

  Render.run(render);
  Runner.run(Runner.create(), engine);

  function updateNodePositions() {
    nodes.forEach((body) => {
      if (body.plugin && body.plugin.node) {
        const { x, y } = body.position;
        const { width, height } = body.plugin;
        body.plugin.node.style.transform = `translate(${x - width / 2}px, ${y - height / 2}px)`;
      }
    });
    requestAnimationFrame(updateNodePositions);
  }

  updateNodePositions();

  nodes.forEach(node => {
    Body.setVelocity(node, {
      x: (Math.random() - 0.8) * 25,
      y: (Math.random() - 0.8) * 10
    });
  });
}

// Update main title and subtitle
function updateMainTitleAndSubtitle() {
  const mainTitle = document.getElementById('main-title');
  const mainSubtitle = document.getElementById('main-subtitle');
  const xIconContainer = document.getElementById('x-icon-container');

  mainTitle.style.fontSize = `${scaleValue(48)}px`;
  mainSubtitle.style.fontSize = `${scaleValue(16)}px`;

  // Scale the X icon
  const xIconSize = scaleValue(28);
  xIconContainer.style.width = `${xIconSize}px`;
  xIconContainer.style.height = `${xIconSize}px`;
}

// Add event listeners to the main title link
const mainTitleLink = document.getElementById('main-title-link');
const xIconLink = document.getElementById('x-icon-link');

mainTitleLink.addEventListener('mouseenter', () => {
  // Change cursor glow to indicate hover over the main title
  cursorGlow.style.boxShadow = `0 0 ${scaleValue(30)}px ${scaleValue(15)}px rgba(38, 139, 217, 0.4)`;
  cursorGlow.style.background = 'rgba(38, 139, 217, 1)';
  cursorGlow.classList.add('hovered');

  // Change main title style
  const mainTitle = document.getElementById('main-title');
  mainTitle.style.filter = 'brightness(1.2)';
  mainTitle.style.textShadow = `0 0 ${scaleValue(30)}px rgba(255, 255, 255, 0.8)`;
});

mainTitleLink.addEventListener('mouseleave', () => {
  // Reset cursor glow
  cursorGlow.style.boxShadow = `0 0 ${scaleValue(30)}px ${scaleValue(15)}px rgba(255, 255, 255, 0.3)`;
  cursorGlow.style.background = 'rgba(255, 255, 255, 1)';
  cursorGlow.classList.remove('hovered');

  // Reset main title style
  const mainTitle = document.getElementById('main-title');
  mainTitle.style.filter = '';
  mainTitle.style.textShadow = '';
});

xIconLink.addEventListener('mouseenter', () => {
  // Change cursor glow to indicate hover over the X icon
  cursorGlow.style.boxShadow = `0 0 ${scaleValue(30)}px ${scaleValue(15)}px rgba(38, 139, 217, 0.4)`;
  cursorGlow.style.background = 'rgba(38, 139, 217, 1)';
  cursorGlow.classList.add('hovered');

  // Change X icon style
  const xIcon = document.getElementById('x-icon');
  xIcon.style.filter = `drop-shadow(0 0 ${scaleValue(5)}px rgba(255, 255, 255, 0.8))`;
});

xIconLink.addEventListener('mouseleave', () => {
  // Reset cursor glow
  cursorGlow.style.boxShadow = `0 0 ${scaleValue(30)}px ${scaleValue(15)}px rgba(255, 255, 255, 0.3)`;
  cursorGlow.style.background = 'rgba(255, 255, 255, 1)';
  cursorGlow.classList.remove('hovered');

  // Reset X icon style
  const xIcon = document.getElementById('x-icon');
  xIcon.style.filter = '';
});

// Append cursorGlow to the body to ensure it covers the entire page
cursorGlow.id = 'cursor-glow';
document.body.appendChild(cursorGlow);

// Update cursorGlow position on mouse move over the whole document
document.addEventListener('mousemove', function(event) {
  const mousePosition = { x: event.clientX, y: event.clientY };
  cursorGlow.style.left = `${mousePosition.x}px`;
  cursorGlow.style.top = `${mousePosition.y}px`;
});

// Single event listener for resize
window.addEventListener('resize', handleResize);

// Initial call to set up sizes and positions
handleResize();