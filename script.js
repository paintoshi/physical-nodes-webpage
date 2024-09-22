const projectsDesktop = [
  { title: 'PaintSwap', description: 'The ultimate open NFT marketplace', link: 'https://paintswap.finance', width: 280, height: 150, team: true },
  { title: 'TinySwap', description: 'Simple crypto swap and bridge', link: 'https://tinyswap.app', width: 160, height: 180, team: false },
  // { title: 'Sonic Music', description: 'Music visualizer of the Sonic chain', link: 'https://music.paintoshi.dev', width: 210, height: 110, team: false },
  { title: 'Estfor Kingdom', description: 'A play-to-earn medieval fantasy idle game', link: 'https://estfor.com', width: 280, height: 150, team: true },
  { title: 'Auth.Cash', description: 'Web3 Account validator', link: 'https://auth.cash', width: 170, height: 170, team: false },
  { title: 'Speed Checker', description: 'Compare the finality of different EVM networks', link: 'https://speedchecker.paintswap.io', width: 260, height: 130, team: true },
  { title: '$BRUSH', description: 'Latest price', link: 'https://brush.paintoshi.dev', width: 140, height: 120, team: false },
];

const projectsMobile= [
  { title: 'PaintSwap', description: 'The ultimate open NFT marketplace', link: 'https://paintswap.finance', width: 0, height: 0, team: true },
  { title: 'Estfor Kingdom', description: 'A play-to-earn fantasy idle game', link: 'https://estfor.com', width: 0, height: 0, team: true },
  { title: 'Speed Checker', description: 'Compare the finality of EVM networks', link: 'https://speedchecker.paintswap.io', width: 0, height: 0, team: false, team: true },
  { title: 'TinySwap', description: 'Simple crypto swap and bridge', link: 'https://tinyswap.app', width: 0, height: 0, team: false },
  { title: 'Auth.Cash', description: 'Web3 Account validator', link: 'https://auth.cash', width: 0, height: 0, team: false },
  // { title: 'Sonic Music', description: 'Music visualizer of the Sonic chain', link: 'https://music.paintoshi.dev', width: 0, height: 0, team: false },
  { title: '$BRUSH', description: 'Latest price', link: 'https://brush.paintoshi.dev', width: 0, height: 0, team: false }
];

let Engine, Render, World, Bodies, Mouse, MouseConstraint, Body, Runner, Vector;
let engine, render, runner, world, mouseConstraint;
let nodes = [];
let isMobile = window.innerWidth <= 768;
let projects = isMobile ? projectsMobile : projectsDesktop;
let scale = 1;
let dragOffset = { x: 0, y: 0 };
let maxNodeSize = 0;
let centerX, centerY, centerRadius, safeZoneRadius;
let hoveredBody = null;
let hoverCheckPending = false;
let resizeTimeout;
let clickStartPosition = null;
let isDragging = false;
let draggedBody = null;
let lastMousePosition = null;
const cursorGlow = document.createElement('div');

// Custom parameters
const baseWidth = 1200;
const baseHeight = 1200;
const friction = 0.2;
const frictionAir = 0.5;
const restitution = 0.8;
const sleepThreshold = 15;
const sleepTolerance = 0.1;
const startBaseStrength = 0.3;
const startRepulsionStrength = 0.2;
const startRepulsionRange = 100;
const minForceThreshold = 0.01;

function initializeMatter() {
  ({ Engine, Render, World, Bodies, Mouse, MouseConstraint, Body, Runner, Vector } = Matter);
  initializeLayout();
}

function updateScale() {
  scale = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight);
}

function updateCursorGlowVisibility() {
  if (isMobile) {
    cursorGlow.style.display = 'none';
    document.body.style.cursor = 'auto'; // Reset cursor style for mobile
  } else {
    cursorGlow.style.display = 'block';
    document.body.style.cursor = 'none'; // Hide default cursor on desktop
  }
}

function preventTextSelection(element) {
  element.addEventListener('touchstart', function(e) {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  }, { passive: false });
}

function updateMobileStatus() {
  const wasMobile = isMobile;
  isMobile = window.innerWidth <= 768;
  
  if (wasMobile !== isMobile) {
    projects = isMobile ? projectsMobile : projectsDesktop;
    updateScale();
    transitionLayout();
    updateCursorGlowVisibility();
  } else {
    updateLayout();
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

function applyCustomGravity() {
  const centerPosition = Vector.create(centerX, centerY);
  const baseStrength = startBaseStrength * scale * scale * scale;
  const minDistance = safeZoneRadius;
  const baseRepulsionStrength = startRepulsionStrength * scale;
  const baseRepulsionRange = startRepulsionRange * scale;

  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i];
    const directionToCenter = Vector.sub(centerPosition, nodeA.position);
    const distanceToCenter = Vector.magnitude(directionToCenter);

    if (distanceToCenter > minDistance) {
      const normalizedDirection = Vector.normalise(directionToCenter);
      const strength = baseStrength * (1 - Math.min(1, minDistance / distanceToCenter));
      if (strength > minForceThreshold) {
        Body.applyForce(nodeA, nodeA.position, Vector.mult(normalizedDirection, strength));
      }
    } else {
      const repelStrength = baseStrength * 0.5;
      Body.applyForce(nodeA, nodeA.position, Vector.mult(Vector.normalise(directionToCenter), -repelStrength));
    }

    for (let j = i + 1; j < nodes.length; j++) {
      const nodeB = nodes[j];
      const edgeDistance = computeEdgeDistance(nodeA, nodeB);
      const repulsionRangeAB = baseRepulsionRange * ((nodeA.plugin.size + nodeB.plugin.size) / (2 * maxNodeSize));

      if (edgeDistance < repulsionRangeAB) {
        const directionBetweenNodes = Vector.sub(nodeB.position, nodeA.position);
        const normalizedDirection = Vector.normalise(directionBetweenNodes);
        const strength = baseRepulsionStrength * (1 - edgeDistance / repulsionRangeAB);

        if (strength > minForceThreshold) {
          const repulsionForce = Vector.mult(normalizedDirection, -strength);
          Body.applyForce(nodeA, nodeA.position, repulsionForce);
          Body.applyForce(nodeB, nodeB.position, Vector.neg(repulsionForce));
        }
      }
    }
  }
}

function reinitializePhysics() {
  if (engine) {
    Engine.clear(engine);
  }
  engine = Engine.create({
    enableSleeping: true,
    gravity: { x: 0, y: 0 },
    sleepTolerance: sleepTolerance,
    timing: { timeScale: 1 }
  });
  world = engine.world;

  // Re-add custom gravity
  Matter.Events.on(engine, 'beforeUpdate', applyCustomGravity);
}

function transitionLayout() {
  if (isMobile) {
    updateMobileLayout();
  } else {
    initializeDesktopLayout();
  }
  updateElementScaling();
}

function updateLayout() {
  if (isMobile) {
    updateMobileLayout();
  } else {
    updateDesktopLayout();
  }
  updateElementScaling();
}

function scaleValue(value) {
  return value * scale;
}

function createNode(project, borderColor) {
  const node = document.createElement('div');
  node.className = 'node';

  // Create the content div
  const contentDiv = document.createElement('div');
  contentDiv.className = 'node-content';
  contentDiv.innerHTML = `<h2>${project.title}</h2><p>${project.description}</p>`;

  node.appendChild(contentDiv);

  node.dataset.link = project.link;

  // Set dynamic styles
  const scaledWidth = isMobile ? 'calc(100% - 32px)' : `${scaleValue(project.width)}px`;
  const scaledHeight = isMobile ? 'auto' : `${scaleValue(project.height)}px`;
  const scaledBorder = isMobile ? '2px' : `${scaleValue(2)}px`;
  const scaledPadding = isMobile ? '12px' : `${scaleValue(12)}px`;
  const scaledBorderRadius = isMobile ? '16px' : `${scaleValue(32)}px`;

  node.style.width = scaledWidth;
  node.style.height = scaledHeight;
  node.style.border = `${scaledBorder} solid ${borderColor}`;
  node.style.boxShadow = `0 0 ${isMobile ? '30px' : `${scaleValue(20)}px`} ${borderColor}`;
  node.style.borderRadius = scaledBorderRadius;
  node.style.padding = scaledPadding;
  node.dataset.borderColor = borderColor;

  // Generate a darker background color
  const darkBackgroundColor = darkenColor(borderColor, 40);
  node.style.backgroundColor = darkBackgroundColor;
  node.style.opacity = '0.9';

  // Scale font sizes
  node.style.fontSize = isMobile ? '14px' : `${scaleValue(16)}px`;
  node.querySelector('h2').style.fontSize = isMobile ? '18px' : `${scaleValue(24)}px`;
  node.querySelector('p').style.fontSize = isMobile ? '14px' : `${scaleValue(16)}px`;

  if (project.team) {
    // Add the team-icon div to the node
    const teamIconDiv = document.createElement('div');
    teamIconDiv.className = 'team-icon';

    const imgElement = document.createElement('img');
    imgElement.src = 'team.svg';
    teamIconDiv.appendChild(imgElement);

    node.appendChild(teamIconDiv);

    // Set styles for team-icon
    teamIconDiv.style.position = 'absolute';

    const iconSize = isMobile ? '20px' : `${scaleValue(24)}px`;
    const iconPadding = isMobile ? '8px' : `${scaleValue(12)}px`;

    teamIconDiv.style.width = iconSize;
    teamIconDiv.style.height = iconSize;
    teamIconDiv.style.top = iconPadding;
    teamIconDiv.style.right = iconPadding;
    teamIconDiv.style.pointerEvents = 'none';

    // Ensure the img fills the container
    imgElement.style.width = '100%';
    imgElement.style.height = '100%';
  }

  return {
    node,
    width: isMobile ? 'calc(100% - 32px)' : scaleValue(project.width),
    height: isMobile ? 'auto' : scaleValue(project.height),
    innerWidth: isMobile ? 'calc(100% - 32px)' : scaleValue(project.width),
    innerHeight: isMobile ? 'auto' : scaleValue(project.height)
  };
}

function createNodes() {
  nodes = [];
  maxNodeSize = 0;

  projects.forEach((project, index) => {
    const angle = (index / projects.length) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * (safeZoneRadius + 200);
    const y = centerY + Math.sin(angle) * (safeZoneRadius + 200);

    const borderColor = colors[index];
    const { node, width, height } = createNode(project, borderColor);
    render.element.appendChild(node);

    const size = (width + height) / 2;
    maxNodeSize = Math.max(maxNodeSize, size);

    const body = Bodies.rectangle(x, y, width, height, {
      friction: friction,
      frictionAir: frictionAir,
      restitution: restitution,
      sleepThreshold: sleepThreshold,
      inertia: Infinity,
      render: { visible: false },
      plugin: { node, project, size, width, height }
    });

    nodes.push(body);
    World.add(world, body);
  });

  nodes.forEach(node => {
    Body.setVelocity(node, {
      x: (Math.random() - 0.8) * 25,
      y: (Math.random() - 0.8) * 10
    });
  });
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
  if (color?.startsWith('hsl')) {
    const hsl = parseHSL(color);
    hsl.l = Math.max(0, hsl.l - percent);
    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  } else if (color?.startsWith('#')) {
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

function initializeLayout() {
  updateScale();
  updateMobileStatus();
  updateCursorGlowVisibility();
  if (isMobile) {
    updateMobileLayout();
  } else {
    setupDesktopLayout();
  }
  updateElementScaling();
}

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

function handleHover(event) {
  if (!isDragging && !hoverCheckPending) {
    hoverCheckPending = true;
    requestAnimationFrame(() => {
      checkHover(event);
      hoverCheckPending = false;
    });
  }
}

function setupMouseInteraction() {
  if (!isMobile) {
    const mouse = Mouse.create(render.canvas);
    mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false }
      }
    });

    World.add(world, mouseConstraint);

    Matter.Events.on(mouseConstraint, 'mousedown', (event) => {
      clickStartPosition = { ...event.mouse.position };
      const clickedBody = Matter.Query.point(nodes, event.mouse.position)[0];
      if (clickedBody) {
        isDragging = true;
        draggedBody = clickedBody;
        lastMousePosition = { ...event.mouse.position };
        // Make the dragged body static to prevent physics from affecting it
        Body.setStatic(draggedBody, true);
        // Disable the mouseConstraint when we start dragging
        mouseConstraint.constraint.stiffness = 0;
      }
    });

    Matter.Events.on(mouseConstraint, 'mousemove', (event) => {
      if (isDragging && draggedBody) {
        Body.setPosition(draggedBody, event.mouse.position);
        lastMousePosition = { ...event.mouse.position };
      } else {
        handleHover(event);
      }
    });

    Matter.Events.on(mouseConstraint, 'mouseup', (event) => {
      if (isDragging && draggedBody) {
        // Make the body non-static again
        Body.setStatic(draggedBody, false);
        // Set the velocity to zero to prevent any residual movement
        Body.setVelocity(draggedBody, { x: 0, y: 0 });
      }
      if (!isDragging) {
        handleClick(event);
      }
      isDragging = false;
      draggedBody = null;
      lastMousePosition = null;
      // Re-enable the mouseConstraint
      mouseConstraint.constraint.stiffness = 0.2;
    });

    // Use pointer events for more precise control
    document.addEventListener('pointerdown', function(event) {
      if (isDragging) {
        event.preventDefault();
      }
    }, true);

    document.addEventListener('pointermove', function(event) {
      if (isDragging && draggedBody) {
        event.preventDefault();
        const mousePosition = { x: event.clientX, y: event.clientY };
        Body.setPosition(draggedBody, mousePosition);
        lastMousePosition = { ...mousePosition };
      }
    }, true);

    document.addEventListener('pointerup', function() {
      if (draggedBody) {
        Body.setStatic(draggedBody, false);
        Body.setVelocity(draggedBody, { x: 0, y: 0 });
      }
      isDragging = false;
      draggedBody = null;
      lastMousePosition = null;
      enableTextHoverEffects();
    }, true);

    document.addEventListener('mouseleave', function() {
      if (draggedBody) {
        Body.setStatic(draggedBody, false);
        Body.setVelocity(draggedBody, { x: 0, y: 0 });
      }
      isDragging = false;
      draggedBody = null;
      lastMousePosition = null;
      if (hoveredBody && hoveredBody.plugin && hoveredBody.plugin.node) {
        const node = hoveredBody.plugin.node;
        node.style.filter = 'brightness(1)';
        node.style.boxShadow = `0 0 ${scaleValue(20)}px ${node.dataset.borderColor}`;
      }
      hoveredBody = null;
      enableTextHoverEffects();
    });
  }
}

function setupDesktopLayout() {
  const networkElement = document.getElementById('network');
  networkElement.innerHTML = '';

  // Clean up existing Matter.js instances if they exist
  if (engine) {
    World.clear(engine.world);
    Engine.clear(engine);
  }
  if (render) {
    Render.stop(render);
    render.canvas.remove();
    render.canvas = null;
    render.context = null;
    render = null;
  }
  if (runner) {
    Runner.stop(runner);
    runner = null;
  }

  networkElement.style.position = 'absolute';
  networkElement.style.width = '100%';
  networkElement.style.height = '100%';
  networkElement.style.padding = '0';

  if (world) {
    World.clear(world);
    Engine.clear(engine);
  }

  engine = Engine.create({
    enableSleeping: true,
    gravity: { x: 0, y: 0 },
    sleepThreshold: 15,
    timing: { timeScale: 1 }
  });
  world = engine.world;

  if (render) {
    Render.stop(render);
    render.canvas.remove();
    render.canvas = null;
    render.context = null;
    render = null;
  }

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

  centerX = render.options.width / 2;
  centerY = render.options.height / 2;
  centerRadius = scaleValue(150);
  safeZoneRadius = centerRadius + scaleValue(250);

  createNodes();
  setupMouseInteraction();

  Matter.Events.on(engine, 'beforeUpdate', applyCustomGravity);

  Render.run(render);
  Runner.run(Runner.create(), engine);
  updateNodePositions();
}

function initializeDesktopLayout() {
  const networkElement = document.getElementById('network');
  networkElement.innerHTML = ''; // Clear existing nodes
  networkElement.style.position = 'absolute';
  networkElement.style.width = '100%';
  networkElement.style.height = '100%';
  networkElement.style.padding = '0';

  // Clear previous world if it exists
  if (world) {
    World.clear(world);
    Engine.clear(engine);
  }

  // Create new engine and world
  engine = Engine.create({
    enableSleeping: true,
    gravity: { x: 0, y: 0 },
    sleepTolerance: 0.1,
    timing: { timeScale: 1 }
  });
  world = engine.world;

  // Create new render
  if (render) {
    Render.stop(render);
    render.canvas.remove();
    render.canvas = null;
    render.context = null;
    render = null;
  }

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

  centerX = render.options.width / 2;
  centerY = render.options.height / 2;
  centerRadius = scaleValue(150);
  safeZoneRadius = centerRadius + scaleValue(250);

  nodes = [];
  maxNodeSize = 0; // Reset maxNodeSize

  projects.forEach((project, index) => {
    const angle = (index / projects.length) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * (safeZoneRadius + 200);
    const y = centerY + Math.sin(angle) * (safeZoneRadius + 200);

    const borderColor = colors[index];
    const { node, width, height } = createNode(project, borderColor);
    networkElement.appendChild(node);

    const size = (width + height) / 2;
    maxNodeSize = Math.max(maxNodeSize, size);

    const body = Bodies.rectangle(x, y, width, height, {
      friction: friction,
      frictionAir: frictionAir,
      restitution: restitution,
      sleepThreshold: sleepThreshold,
      inertia: Infinity,
      render: { visible: false },
      plugin: { node, project, size, width, height }
    });

    nodes.push(body);
    World.add(world, body);
  });

  // Recreate mouse constraint
  const mouse = Mouse.create(render.canvas);
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.2,
      render: { visible: false }
    }
  });

  World.add(world, mouseConstraint);

  // Add custom gravity
  Matter.Events.on(engine, 'beforeUpdate', applyCustomGravity);

  Render.run(render);
  Runner.run(Runner.create(), engine);
  updateNodePositions();

  // Reapply initial velocities
  nodes.forEach(node => {
    Body.setVelocity(node, {
      x: (Math.random() - 0.8) * 25,
      y: (Math.random() - 0.8) * 10
    });
  });
}

function updateDesktopLayout() {
  if (render) {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
    render.options.width = window.innerWidth;
    render.options.height = window.innerHeight;
    Matter.Render.setPixelRatio(render, window.devicePixelRatio);

    centerX = render.options.width / 2;
    centerY = render.options.height / 2;
    centerRadius = scaleValue(150);
    safeZoneRadius = centerRadius + scaleValue(250);

    updateBodySizes();

    nodes.forEach((body, index) => {
      const project = projects[index];
      const scaledWidth = scaleValue(project.width);
      const scaledHeight = scaleValue(project.height);
      
      Matter.Body.scale(body, scaledWidth / body.plugin.width, scaledHeight / body.plugin.height);
      body.plugin.width = scaledWidth;
      body.plugin.height = scaledHeight;

      if (body.plugin && body.plugin.node) {
        const node = body.plugin.node;
        node.style.width = `${scaledWidth}px`;
        node.style.height = `${scaledHeight}px`;
        node.style.position = 'absolute';
        node.style.fontSize = `${scaleValue(16)}px`;
        node.querySelector('h2').style.fontSize = `${scaleValue(24)}px`;
        node.querySelector('p').style.fontSize = `${scaleValue(16)}px`;
        node.style.borderRadius = `${scaleValue(32)}px`;
        node.style.padding = `${scaleValue(12)}px`;
        node.style.boxShadow = `0 0 ${scaleValue(20)}px ${node.dataset.borderColor}`;
      }
    });
  } else {
    console.warn("Render is not initialized. Reinitializing desktop layout.");
    initializeDesktopLayout();
  }

  // Reset container and title styles for desktop
  const container = document.getElementById('container');
  container.style.height = '100%';
  container.style.overflow = 'hidden';

  const titleSubtitleContainer = document.getElementById('title-subtitle-container');
  titleSubtitleContainer.style.position = 'absolute';
  titleSubtitleContainer.style.top = '50%';
  titleSubtitleContainer.style.left = '50%';
  titleSubtitleContainer.style.transform = 'translate(-50%, -50%)';
  titleSubtitleContainer.style.padding = '0';

  const network = document.getElementById('network');
  network.style.position = 'absolute';
  network.style.width = '100%';
  network.style.height = '100%';
  network.style.padding = '0';
}

function handleMobileNodeClick(event) {
  event.preventDefault();
  const clickedNode = event.currentTarget;
  if (clickedNode && clickedNode.dataset.link) {
    window.open(clickedNode.dataset.link);
  }
}

function handleMobileTouchStart(event) {
  touchStartPosition = {
    x: event.touches[0].clientX,
    y: event.touches[0].clientY
  };
  const node = event.currentTarget;
  if (node) {
    // Apply glow effect
    node.style.filter = 'brightness(1.2)';
    node.style.boxShadow = `0 0 40px ${node.dataset.borderColor}`;
  }
}

function handleMobileTouchEnd(event) {
  event.preventDefault();
  const node = event.currentTarget;
  if (node) {
    // Remove glow effect
    node.style.filter = 'brightness(1)';
    node.style.boxShadow = `0 0 20px ${node.dataset.borderColor}`;
  }
  if (touchStartPosition) {
    const touchEndPosition = {
      x: event.changedTouches[0].clientX,
      y: event.changedTouches[0].clientY
    };
    
    const dx = touchEndPosition.x - touchStartPosition.x;
    const dy = touchEndPosition.y - touchStartPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If the touch moved less than 10 pixels, consider it a tap
    if (distance < 10) {
      const clickedNode = event.currentTarget;
      if (clickedNode && clickedNode.dataset.link) {
        window.open(clickedNode.dataset.link);
      }
    }
  }
  touchStartPosition = null;
}

function handleMobileTouchCancel(event) {
  const node = event.currentTarget;
  if (node) {
    // Remove glow effect
    node.style.filter = 'brightness(1)';
    node.style.boxShadow = `0 0 20px ${node.dataset.borderColor}`;
  }
  touchStartPosition = null;
}

function handleMobileTouchMove(event) {
  const node = event.currentTarget;
  if (node) {
    const touch = event.touches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;
    const rect = node.getBoundingClientRect();
    if (touchX < rect.left || touchX > rect.right || touchY < rect.top || touchY > rect.bottom) {
      // Touch moved outside the node, remove glow effect
      node.style.filter = 'brightness(1)';
      node.style.boxShadow = `0 0 20px ${node.dataset.borderColor}`;
    } else {
      // Touch is still within the node, ensure the glow effect is applied
      node.style.filter = 'brightness(1.2)';
      node.style.boxShadow = `0 0 40px ${node.dataset.borderColor}`;
    }
  }
}

function updateMobileLayout() {
  const network = document.getElementById('network');
  network.innerHTML = ''; // Clear existing nodes
  network.style.position = 'static';
  network.style.width = '100%';
  network.style.height = 'auto';
  network.style.padding = '20px 32px';

  projects.forEach((project, index) => {
    const borderColor = colors[index];
    const { node } = createNode(project, borderColor);
    network.appendChild(node);

    // Apply mobile-specific styles
    node.style.position = 'static';
    node.style.width = 'calc(100% - 64px)';
    node.style.height = 'auto';
    node.style.marginBottom = '48px';
    node.style.padding = '32px 8px';
    node.style.transform = 'none';
    node.style.fontSize = '14px'; // Base font size for mobile
    node.style.pointerEvents = 'auto'; // To enable touch events on mobile

    // Adjust title and description font sizes
    const title = node.querySelector('h2');
    const description = node.querySelector('p');
    title.style.fontSize = '18px';
    description.style.fontSize = '14px';

    // Add touch event listeners for mobile
    node.addEventListener('touchstart', handleMobileTouchStart, { passive: true });
    node.addEventListener('touchend', handleMobileTouchEnd, { passive: true });
    node.addEventListener('touchcancel', handleMobileTouchCancel, { passive: true });
    node.addEventListener('touchmove', handleMobileTouchMove, { passive: true });
  });

  // Adjust container and title styles for mobile
  const container = document.getElementById('container');
  container.style.height = 'auto';
  container.style.minHeight = '100vh';
  container.style.overflow = 'visible';

  const titleSubtitleContainer = document.getElementById('title-subtitle-container');
  titleSubtitleContainer.style.position = 'static';
  titleSubtitleContainer.style.transform = 'none';
  titleSubtitleContainer.style.padding = '20px 16px';
  titleSubtitleContainer.style.marginBottom = '20px'; // Add space between title and nodes

  const mainTitle = document.getElementById('main-title');
  const mainSubtitle = document.getElementById('main-subtitle');
  mainTitle.style.fontSize = '32px'; // Adjust based on your preference
  mainSubtitle.style.fontSize = '18px'; // Adjust based on your preference

  const xIconContainer = document.getElementById('x-icon-container');
  const discordIconContainer = document.getElementById('discord-icon-container');
  xIconContainer.style.width = '24px';
  xIconContainer.style.height = '24px';
  discordIconContainer.style.width = '24px';
  discordIconContainer.style.height = '24px';
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

// Update main title and subtitle
function updateElementScaling() {
  const mainTitle = document.getElementById('main-title');
  const mainSubtitle = document.getElementById('main-subtitle');
  const xIconContainer = document.getElementById('x-icon-container');
  const discordIconContainer = document.getElementById('discord-icon-container');

  mainTitle.style.fontSize = `${scaleValue(48)}px`;
  mainSubtitle.style.fontSize = `${scaleValue(16)}px`;

  // Scale the X icon
  if (!isMobile) {
    const xIconSize = scaleValue(28);
    xIconContainer.style.width = `${xIconSize}px`;
    xIconContainer.style.height = `${xIconSize}px`;
  }

  // Scale the Discord icon
  if (!isMobile) {
    const discordIconSize = scaleValue(28);
    discordIconContainer.style.width = `${discordIconSize}px`;
    discordIconContainer.style.height = `${discordIconSize}px`;
  }

  // Update team-icon sizes
  nodes.forEach((body) => {
    if (body.plugin && body.plugin.node) {
      const node = body.plugin.node;
      const teamIconDiv = node.querySelector('.team-icon');
      if (teamIconDiv) {
        const iconSize = isMobile ? '20px' : `${scaleValue(24)}px`;
        const iconPadding = isMobile ? '8px' : `${scaleValue(12)}px`;

        teamIconDiv.style.width = iconSize;
        teamIconDiv.style.height = iconSize;
        teamIconDiv.style.top = iconPadding;
        teamIconDiv.style.right = iconPadding;
      }
    }
  });
}

function handleElementHover(event) {
  if (!isDragging) {
    cursorGlow.style.boxShadow = `0 0 ${scaleValue(30)}px ${scaleValue(15)}px rgba(38, 139, 217, 0.4)`;
    cursorGlow.style.background = 'rgba(38, 139, 217, 1)';
    cursorGlow.classList.add('hovered');

    if (event.target.id === 'main-title-link') {
      const mainTitle = document.getElementById('main-title');
      mainTitle.style.filter = 'brightness(1.2)';
      mainTitle.style.textShadow = `0 0 ${scaleValue(30)}px rgba(255, 255, 255, 0.8)`;
    } else {
      const icon = event.target.querySelector('svg');
      if (icon) {
        icon.style.filter = `drop-shadow(0 0 ${scaleValue(5)}px rgba(255, 255, 255, 0.8))`;
      }
    }
  }
}

function disableTextHoverEffects() {
  const mainTitle = document.getElementById('main-title');
  const mainSubtitle = document.getElementById('main-subtitle');
  const xIcon = document.getElementById('x-icon');
  const discordIcon = document.getElementById('discord-icon');

  mainTitle.style.pointerEvents = 'none';
  mainSubtitle.style.pointerEvents = 'none';
  xIcon.style.pointerEvents = 'none';
  discordIcon.style.pointerEvents = 'none';

  cursorGlow.style.boxShadow = `0 0 ${scaleValue(30)}px ${scaleValue(15)}px rgba(255, 255, 255, 0.3)`;
  cursorGlow.style.background = 'rgba(255, 255, 255, 1)';
  cursorGlow.classList.remove('hovered');
}

// New function to enable text hover effects
function enableTextHoverEffects() {
  const mainTitle = document.getElementById('main-title');
  const mainSubtitle = document.getElementById('main-subtitle');
  const xIcon = document.getElementById('x-icon');
  const discordIcon = document.getElementById('discord-icon');

  mainTitle.style.pointerEvents = 'auto';
  mainSubtitle.style.pointerEvents = 'auto';
  xIcon.style.pointerEvents = 'auto';
  discordIcon.style.pointerEvents = 'auto';
}

function handleElementLeave() {
  cursorGlow.style.boxShadow = `0 0 ${scaleValue(30)}px ${scaleValue(15)}px rgba(255, 255, 255, 0.3)`;
  cursorGlow.style.background = 'rgba(255, 255, 255, 1)';
  cursorGlow.classList.remove('hovered');

  const mainTitle = document.getElementById('main-title');
  mainTitle.style.filter = '';
  mainTitle.style.textShadow = '';

  const icons = document.querySelectorAll('#x-icon, #discord-icon');
  icons.forEach(icon => icon.style.filter = '');
}

const colors = getDistinctColors(projects.length);
if (isMobile) {
  const network = document.getElementById('network');
  projects.forEach((project, index) => {
    const borderColor = colors[index];
    network.appendChild(createNode(project, borderColor).node);
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

  function handleClick(event) {
    if (!isMobile) {
      // Desktop click handling
      if (clickStartPosition) {
        const clickEndPosition = event.mouse.position;
        const dx = clickEndPosition.x - clickStartPosition.x;
        const dy = clickEndPosition.y - clickStartPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
  
        if (distance < 5) {
          const clickedBody = Matter.Query.point(nodes, clickEndPosition)[0];
          if (clickedBody && clickedBody.plugin && clickedBody.plugin.project) {
            window.open(clickedBody.plugin.project.link);
          }
        }
        clickStartPosition = null;
      }
    }
  }

  // Handle when the mouse leaves the canvas
  render.canvas.addEventListener('mouseleave', function() {
    if (hoveredBody && hoveredBody.plugin && hoveredBody.plugin.node) {
      const node = hoveredBody.plugin.node;
      node.style.filter = 'brightness(1)';
      node.style.boxShadow = `0 0 20px ${node.dataset.borderColor}`;
    }
    hoveredBody = null;
  });

  Render.run(render);
  Runner.run(Runner.create(), engine);

  updateNodePositions();
}

const mainTitleLink = document.getElementById('main-title-link');
const xIconLink = document.getElementById('x-icon-link');
const discordIconLink = document.getElementById('discord-icon-link');

mainTitleLink.addEventListener('pointerenter', handleElementHover);
mainTitleLink.addEventListener('pointerleave', handleElementLeave);
xIconLink.addEventListener('pointerenter', handleElementHover);
xIconLink.addEventListener('pointerleave', handleElementLeave);
discordIconLink.addEventListener('pointerenter', handleElementHover);
discordIconLink.addEventListener('pointerleave', handleElementLeave);

// Append cursorGlow to the body to ensure it covers the entire page
cursorGlow.id = 'cursor-glow';
document.body.appendChild(cursorGlow);

// Update cursorGlow position on mouse move over the whole document
document.addEventListener('mousemove', function(event) {
  const mousePosition = { x: event.clientX, y: event.clientY };
  cursorGlow.style.left = `${mousePosition.x}px`;
  cursorGlow.style.top = `${mousePosition.y}px`;
  
  if (isDragging && draggedBody) {
    Body.setPosition(draggedBody, mousePosition);
    lastMousePosition = { ...mousePosition };
    disableTextHoverEffects();
  } else {
    enableTextHoverEffects();
  }
});

// Prevent long press from triggering text selection
document.addEventListener('contextmenu', function(e) {
  if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
  }
}, { passive: false });

// Apply preventTextSelection to specific elements that shouldn't be selectable
document.querySelectorAll('.node, #main-subtitle').forEach(preventTextSelection);

// Ensure links work properly
document.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', function(e) {
    e.stopPropagation();
  });
});

// Initial setup
initializeMatter();

// Event listener for window resize
window.addEventListener('resize', () => {
  const wasMobile = isMobile;
  updateScale();
  updateMobileStatus();
  updateCursorGlowVisibility();

  if (wasMobile !== isMobile) {
    if (isMobile) {
      updateMobileLayout();
    } else {
      setupDesktopLayout();
    }
  } else if (!isMobile) {
    updateDesktopLayout();
  }

  updateElementScaling();
});

window.addEventListener('load', initializeLayout);