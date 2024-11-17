const projectsDesktop = [
  { title: 'PaintSwap', description: 'The ultimate open NFT marketplace', link: 'https://paintswap.finance', width: 280, height: 150, team: true },
  { title: 'TinySwap', description: 'Simple crypto swap and bridge', link: 'https://tinyswap.app', width: 160, height: 180, team: false },
  { title: 'Estfor Kingdom', description: 'A play-to-earn medieval fantasy idle game', link: 'https://estfor.com', width: 280, height: 150, team: true },
  { title: 'Fantom Music', description: 'Music visualizer of the Fantom chain', link: 'https://music.paintoshi.dev', width: 210, height: 110, team: false },
  { title: 'Speed Checker', description: 'Compare the finality of different EVM networks', link: 'https://speedchecker.paintswap.io', width: 260, height: 130, team: true },
  { title: '$BRUSH', description: 'Latest price', link: 'https://brush.paintoshi.dev', width: 140, height: 120, team: false },
];

const projectsMobile= [
  { title: 'PaintSwap', description: 'The ultimate open NFT marketplace', link: 'https://paintswap.finance', width: 0, height: 0, team: true },
  { title: 'Estfor Kingdom', description: 'A play-to-earn fantasy idle game', link: 'https://estfor.com', width: 0, height: 0, team: true },
  { title: 'Speed Checker', description: 'Compare the finality of EVM networks', link: 'https://speedchecker.paintswap.io', width: 0, height: 0, team: false, team: true },
  { title: 'TinySwap', description: 'Simple crypto swap and bridge', link: 'https://tinyswap.app', width: 0, height: 0, team: false },
  { title: 'Fantom Music', description: 'Music visualizer of the Fantom chain', link: 'https://music.paintoshi.dev', width: 0, height: 0, team: false },
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
let applyCustomGravityHandler = null;
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

const styleConfig = {
  mobile: {
    node: {
      width: 'calc(100% - 32px)',
      height: 'auto',
      fontSize: '14px',
      h2FontSize: '18px',
      pFontSize: '14px',
      borderSize: '2px',
      borderRadius: '16px',
      paddingSize: '24px 8px',
      boxShadowSize: '30px'
    },
    teamText: {
      fontSize: '10px',
      borderWidth: '1px',
      padding: '2px 4px',
      borderRadius: '4px'
    },
    teamIcon: {
      top: '6px',
      right: '8px'
    },
    mainTitleFontSize: '32px',
    mainSubtitleFontSize: '18px',
    iconSize: '24px',
    touchActiveBoxShadowSize: '40px',
    networkPadding: '20px 32px',
    nodeMarginBottom: '48px',
    titleSubtitleContainerPadding: '20px 16px',
    titleSubtitleContainerMarginBottom: '20px',
  },
  desktop: {
    node: {
      width: project => `${scaleValue(project.width)}px`,
      height: project => `${scaleValue(project.height)}px`,
      fontSize: () => `${scaleValue(16)}px`,
      h2FontSize: () => `${scaleValue(24)}px`,
      pFontSize: () => `${scaleValue(16)}px`,
      borderSize: () => `${scaleValue(2)}px`,
      borderRadius: () => `${scaleValue(24)}px`,
      paddingSize: () => `${scaleValue(12)}px`,
      boxShadowSize: () => `${scaleValue(20)}px`
    },
    teamText: {
      fontSize: () => `${scaleValue(10)}px`,
      borderWidth: () => `${scaleValue(1)}px`,
      padding: () => `${scaleValue(2)}px ${scaleValue(4)}px`,
      borderRadius: () => `${scaleValue(4)}px`
    },
    teamIcon: {
      top: () => `${scaleValue(10)}px`,
      right: () => `${scaleValue(12)}px`
    },
    mainTitleFontSize: () => `${scaleValue(48)}px`,
    mainSubtitleFontSize: () => `${scaleValue(16)}px`,
    iconSize: () => `${scaleValue(28)}px`,
    containerStyles: {
      height: '100%',
      overflow: 'hidden'
    },
    titleSubtitleContainerStyles: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      padding: '0'
    },
    networkStyles: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      padding: '0'
    },
    hoverBoxShadowSize: () => `${scaleValue(30)}px`,
    defaultBoxShadowSize: () => `${scaleValue(20)}px`,
    iconDropShadowSize: () => `${scaleValue(5)}px`,
  },
  cursorGlow: {
    defaultBoxShadow: () => `0 0 ${scaleValue(30)}px ${scaleValue(15)}px rgba(255, 255, 255, 0.3)`,
    hoveredBoxShadow: (color) => `0 0 ${scaleValue(30)}px ${scaleValue(15)}px ${applyOpacity(color, 0.4)}`,
    defaultBackground: 'rgba(255, 255, 255, 1)'
  },
  elementHover: {
    brightness: 'brightness(1.2)',
    textShadow: () => `0 0 ${scaleValue(30)}px rgba(255, 255, 255, 0.8)`
  }
};

function getNodeStyles(project, borderColor) {
  const config = isMobile ? styleConfig.mobile.node : styleConfig.desktop.node;
  const fontSize = isMobile ? styleConfig.mobile.node.fontSize : styleConfig.desktop.node.fontSize();
  const borderSize = isMobile ? styleConfig.mobile.node.borderSize : styleConfig.desktop.node.borderSize();
  const borderRadius = isMobile ? styleConfig.mobile.node.borderRadius : styleConfig.desktop.node.borderRadius();
  const paddingSize = isMobile ? styleConfig.mobile.node.paddingSize : styleConfig.desktop.node.paddingSize();
  const boxShadowSize = isMobile ? styleConfig.mobile.node.boxShadowSize : styleConfig.desktop.node.boxShadowSize();
  return {
    width: isMobile ? config.width : config.width(project),
    height: isMobile ? config.height : config.height(project),
    fontSize,
    border: `${borderSize} solid ${borderColor}`,
    boxShadow: `0 0 ${boxShadowSize} ${borderColor}`,
    borderRadius: borderRadius,
    padding: paddingSize,
    backgroundColor: darkenColor(borderColor, 40),
    opacity: '0.9'
  };
}

function applyTeamTextStyles(teamText) {
  const fontSize = isMobile ? styleConfig.mobile.teamText.fontSize : styleConfig.desktop.teamText.fontSize();
  const borderWidth = isMobile ? styleConfig.mobile.teamText.borderWidth : styleConfig.desktop.teamText.borderWidth();
  const padding = isMobile ? styleConfig.mobile.teamText.padding : styleConfig.desktop.teamText.padding();
  const borderRadius = isMobile ? styleConfig.mobile.teamText.borderRadius : styleConfig.desktop.teamText.borderRadius();

  Object.assign(teamText.style, {
    fontSize: fontSize,
    fontFamily: 'Orbitron, sans-serif',
    border: `${borderWidth} solid #d9e4ed`,
    padding: padding,
    borderRadius: borderRadius,
    lineHeight: '1',
    color: '#d9e4ed',
    display: 'inline-block'
  });
}

function getTeamIconStyles() {
  const top = isMobile ? styleConfig.mobile.teamIcon.top : styleConfig.desktop.teamIcon.top();
  const right = isMobile ? styleConfig.mobile.teamIcon.right : styleConfig.desktop.teamIcon.right();
  return {
    position: 'absolute',
    top: top,
    right: right,
    pointerEvents: 'none',
    width: 'auto',
    height: 'auto'
  };
}

function applyNodeTouchEffect(node, isActive) {
  const boxShadowSize = isActive
    ? styleConfig.mobile.touchActiveBoxShadowSize
    : styleConfig.mobile.node.boxShadowSize;
  node.style.filter = isActive ? 'brightness(1.2)' : 'brightness(1)';
  node.style.boxShadow = `0 0 ${boxShadowSize} ${node.dataset.borderColor}`;
}

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
  // Recalculate centerX and centerY based on the current render dimensions
  centerX = render.options.width / 2;
  centerY = render.options.height / 2;
  centerRadius = 250 * Math.pow(scale, 3);
  safeZoneRadiusX = centerRadius + scaleValue(250);
  safeZoneRadiusY = safeZoneRadiusX * 0.7; // Height is 70% of the width

  const centerPosition = Vector.create(centerX, centerY);
  const baseStrength = startBaseStrength * Math.pow(scale, 4);
  const baseRepulsionStrength = startRepulsionStrength * scale;
  const baseRepulsionRange = startRepulsionRange * scale;

  nodes.forEach((nodeA, i) => {
    const directionToCenter = Vector.sub(centerPosition, nodeA.position);

    // Calculate the normalized distance to the ellipse edge
    const normalizedX = directionToCenter.x / safeZoneRadiusX;
    const normalizedY = directionToCenter.y / safeZoneRadiusY;
    const normalizedDistance = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);

    if (normalizedDistance > 1) {
      const normalizedDirection = Vector.normalise(directionToCenter);
      const strength = baseStrength * (1 - Math.min(1, 1 / normalizedDistance));
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
  });
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

function updateNodeFontSizes(node) {
  const h2 = node.querySelector('h2');
  const p = node.querySelector('p');
  h2.style.fontSize = isMobile ? styleConfig.mobile.node.h2FontSize : styleConfig.desktop.node.h2FontSize();
  p.style.fontSize = isMobile ? styleConfig.mobile.node.pFontSize : styleConfig.desktop.node.pFontSize();
}

function applyTeamTextStyles(teamText) {
 const fontSize = isMobile ? styleConfig.mobile.teamText.fontSize : styleConfig.desktop.teamText.fontSize();
 const borderWidth = isMobile ? styleConfig.mobile.teamText.borderWidth : styleConfig.desktop.teamText.borderWidth();
 const paddingValue = isMobile ? styleConfig.mobile.teamText.padding : styleConfig.desktop.teamText.padding();
 const borderRadiusValue = isMobile ? styleConfig.mobile.teamText.borderRadius : styleConfig.desktop.teamText.borderRadius();

  teamText.style.fontSize = fontSize;
  teamText.style.fontFamily = 'Orbitron, sans-serif';
  teamText.style.border = `${borderWidth} solid #d9e4ed`;
  teamText.style.padding = paddingValue;
  teamText.style.borderRadius = borderRadiusValue;
  teamText.style.lineHeight = '1';
  teamText.style.color = '#d9e4ed';
  teamText.style.display = 'inline-block';
}

function createNode(project, borderColor) {
  const node = document.createElement('div');
  node.className = 'node';
  
  // Create the content div
  const contentDiv = document.createElement('div');
  contentDiv.className = 'node-content';
  contentDiv.innerHTML = `<h2>${project.title}</h2><p>${project.description}</p>`;
  node.appendChild(contentDiv);

  // Append node to the DOM to get accurate measurements
  document.body.appendChild(node);

  // Compute scaled dimensions
  const scaledWidth = isMobile ? (window.innerWidth - 64) : scaleValue(project.width);
  node.style.width = isMobile ? `calc(100% - 64px)` : `${scaledWidth}px`;

  // Allow the browser to render the node and compute height
  let scaledHeight;
  if (isMobile) {
    scaledHeight = node.getBoundingClientRect().height;
  } else {
    scaledHeight = scaleValue(project.height);
    node.style.height = `${scaledHeight}px`;
  }

  // Remove node from the DOM and re-append it later
  document.body.removeChild(node);
  node.dataset.link = project.link;
  node.dataset.borderColor = borderColor;

  // Apply node styles
  Object.assign(node.style, getNodeStyles(project, borderColor));

  // Set font sizes for h2 and p
  updateNodeFontSizes(node);

  if (project.team) {
    const teamIconDiv = document.createElement('div');
    teamIconDiv.className = 'team-icon';

    const teamText = document.createElement('span');
    teamText.innerText = 'TEAM';

    applyTeamTextStyles(teamText);

    teamIconDiv.appendChild(teamText);
    node.appendChild(teamIconDiv);

    // Apply team icon styles
    Object.assign(teamIconDiv.style, getTeamIconStyles());
  }

  return {
    node,
    width: isMobile ? styleConfig.mobile.node.width : scaleValue(project.width),
    height: isMobile ? styleConfig.mobile.node.height : scaleValue(project.height),
    innerWidth: isMobile ? styleConfig.mobile.node.width : scaleValue(project.width),
    innerHeight: isMobile ? styleConfig.mobile.node.height : scaleValue(project.height)
  };
}

function createNodes() {
  nodes = [];

  projects.forEach((project, index) => {
    const angle = (index / projects.length) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * (safeZoneRadius + 200);
    const y = centerY + Math.sin(angle) * (safeZoneRadius + 200);

    const borderColor = colors[index];
    const { node, width, height } = createNode(project, borderColor);
    render.element.appendChild(node);

    const body = Bodies.rectangle(x, y, width, height, {
      friction: friction,
      frictionAir: frictionAir,
      restitution: restitution,
      sleepThreshold: sleepThreshold,
      inertia: Infinity,
      render: { visible: false },
      plugin: { node, project, width, height }
    });

    nodes.push(body);
    World.add(world, body);
    updateNodeSize(body);
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
    initializeDesktopLayout();
  }
  updateElementScaling();
}

function updateNodePosition(body) {
  if (body.plugin && body.plugin.node) {
    const { x, y } = body.position;
    const { width, height } = body.plugin;
    body.plugin.node.style.left = `${x - width / 2}px`;
    body.plugin.node.style.top = `${y - height / 2}px`;
  }
}

function updateNodePositions() {
  nodes.forEach((body) => {
    if (!isDragging || body !== draggedBody) {
      updateNodePosition(body);
    }
  });
  requestAnimationFrame(updateNodePositions);
}

function updateNodeSize(body) {
  const { node, project } = body.plugin;

  // Recompute scaled dimensions
  const scaledWidth = isMobile ? (window.innerWidth - 64) : scaleValue(project.width);
  let scaledHeight;

  if (isMobile) {
    node.style.width = `calc(100% - 64px)`;
    scaledHeight = node.getBoundingClientRect().height;
  } else {
    scaledHeight = scaleValue(project.height);
    node.style.width = `${scaledWidth}px`;
    node.style.height = `${scaledHeight}px`;
  }

  // Update body and plugin dimensions
  Body.setVertices(body, Matter.Vertices.fromPath(`0 0 ${scaledWidth} 0 ${scaledWidth} ${scaledHeight} 0 ${scaledHeight}`));
  body.plugin.width = scaledWidth;
  body.plugin.height = scaledHeight;

  // Update font sizes
  updateNodeFontSizes(node);
}

function checkHover(event) {
  const mousePosition = event.mouse.position;
  let bodyUnderMouse = nodes.find(body => isPointInsideBody(mousePosition, body));

  if (bodyUnderMouse !== hoveredBody) {
    // Remove hover effect from the previous node
    if (hoveredBody && hoveredBody.plugin && hoveredBody.plugin.node) {
      const node = hoveredBody.plugin.node;
      node.style.filter = 'brightness(1)';
      node.style.boxShadow = `0 0 ${styleConfig.desktop.node.boxShadowSize()} ${node.dataset.borderColor}`;
    }

    // Apply hover effect to the new node
    if (bodyUnderMouse && bodyUnderMouse.plugin && bodyUnderMouse.plugin.node) {
      const node = bodyUnderMouse.plugin.node;
      const borderColor = node.dataset.borderColor;
      node.style.filter = styleConfig.elementHover.brightness;
      node.style.boxShadow = `0 0 ${styleConfig.desktop.hoverBoxShadowSize()} ${borderColor}`;

      cursorGlow.style.boxShadow = styleConfig.cursorGlow.hoveredBoxShadow(borderColor);
      cursorGlow.style.background = borderColor;
      cursorGlow.classList.add('hovered');
    } else {
      cursorGlow.style.boxShadow = styleConfig.cursorGlow.defaultBoxShadow();
      cursorGlow.style.background = styleConfig.cursorGlow.defaultBackground;
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

function isPointInsideBody(point, body) {
  if (body.plugin && body.plugin.node) {
    const rect = body.plugin.node.getBoundingClientRect();

    // Adjust point coordinates relative to the viewport
    const mouseX = point.x + window.scrollX;
    const mouseY = point.y + window.scrollY;

    return (
      mouseX >= rect.left &&
      mouseX <= rect.right &&
      mouseY >= rect.top &&
      mouseY <= rect.bottom
    );
  }
  return false;
}

function setupMouseInteraction() {
  if (!isMobile) {
    const canvas = render.canvas;
    let mouseDownTime = 0;
    const clickThreshold = 200; // milliseconds

    canvas.addEventListener('mousedown', (event) => {
      const mousePosition = {
        x: event.clientX - canvas.getBoundingClientRect().left,
        y: event.clientY - canvas.getBoundingClientRect().top
      };
      clickStartPosition = { ...mousePosition };
      const clickedBody = nodes.find(body => isPointInsideBody(mousePosition, body));
      if (clickedBody) {
        mouseDownTime = Date.now();
        draggedBody = clickedBody;
        dragOffset = {
          x: mousePosition.x - clickedBody.position.x,
          y: mousePosition.y - clickedBody.position.y
        };
      }
    });

    document.addEventListener('mousemove', (event) => {
      const mousePosition = {
        x: event.clientX - canvas.getBoundingClientRect().left,
        y: event.clientY - canvas.getBoundingClientRect().top
      };
    
      // Only set isDragging to true if we are not already dragging
      if (!isDragging && draggedBody && clickStartPosition) {
        const movedEnough = Math.abs(mousePosition.x - clickStartPosition.x) > 5 || Math.abs(mousePosition.y - clickStartPosition.y) > 5;
        if (movedEnough) {
          isDragging = true;
        }
      }
    
      if (isDragging && draggedBody) {
        const newPosition = {
          x: mousePosition.x - dragOffset.x,
          y: mousePosition.y - dragOffset.y
        };
        Matter.Body.setPosition(draggedBody, newPosition);
        updateNodePosition(draggedBody);
        disableTextHoverEffects();
      } else {
        handleHover({ mouse: { position: mousePosition } });
        enableTextHoverEffects();
      }
    });

    // Handle mouseup on canvas for hyperlink clicks
    canvas.addEventListener('mouseup', (event) => {
      const mouseUpTime = Date.now();
      const clickDuration = mouseUpTime - mouseDownTime;

      if (draggedBody && !isDragging && clickDuration < clickThreshold) {
        // This was a click, not a drag
        if (draggedBody.plugin && draggedBody.plugin.project) {
          window.open(draggedBody.plugin.project.link, '_blank');
        }
      }
    });

    // Handle mouseup on document for ending drags
    document.addEventListener('mouseup', () => {
      if (isDragging && draggedBody) {
        Body.setVelocity(draggedBody, { x: 0, y: 0 });
      }

      isDragging = false;
      draggedBody = null;
      dragOffset = { x: 0, y: 0 };
      clickStartPosition = null;
    });

    document.addEventListener('mouseleave', () => {
      if (isDragging && draggedBody) {
        Body.setVelocity(draggedBody, { x: 0, y: 0 });
      }
      isDragging = false;
      draggedBody = null;
      if (hoveredBody && hoveredBody.plugin && hoveredBody.plugin.node) {
        const node = hoveredBody.plugin.node;
        node.style.filter = 'brightness(1)';
        node.style.boxShadow = `0 0 ${styleConfig.desktop.defaultBoxShadowSize()} ${node.dataset.borderColor}`;
      }
      hoveredBody = null;
      enableTextHoverEffects();
    });
  }
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
    centerRadius = scaleValue(200);
    safeZoneRadiusX = centerRadius + scaleValue(250);
    safeZoneRadiusY = safeZoneRadiusX * 0.6;

    updateBodySizes();

    nodes.forEach((body) => {
      updateNodeSize(body);
      updateNodePosition(body);
      updateNodeFontSizes(body.plugin.node);
    });
  } else {
    console.warn("Render is not initialized. Reinitializing desktop layout.");
    initializeDesktopLayout();
  }

  // Reset container and title styles for desktop
  const container = document.getElementById('container');
  Object.assign(container.style, styleConfig.desktop.containerStyles);

  const titleSubtitleContainer = document.getElementById('title-subtitle-container');
  Object.assign(titleSubtitleContainer.style, styleConfig.desktop.titleSubtitleContainerStyles);

  const network = document.getElementById('network');
  Object.assign(network.style, styleConfig.desktop.networkStyles);

  // Update font sizes for all nodes
  nodes.forEach((body) => {
    if (body.plugin && body.plugin.node) {
      updateNodeFontSizes(body.plugin.node);
    }
  });
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
  if (isMobile) {
    const mouse = Mouse.create(render.canvas);
    mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false }
      }
    });
  
    World.add(world, mouseConstraint);
  }

  // Remove existing applyCustomGravity listener if it exists
  if (applyCustomGravityHandler) {
    Matter.Events.off(engine, 'beforeUpdate', applyCustomGravityHandler);
  }

  // Create a new handler that captures the latest variables
  applyCustomGravityHandler = function() {
    applyCustomGravity();
  };

  // Add custom gravity
  Matter.Events.on(engine, 'beforeUpdate', applyCustomGravityHandler);

  Render.run(render);
  Runner.run(Runner.create(), engine);
  updateNodePositions();

  // Reapply initial velocities
  nodes.forEach(node => {
    Body.setVelocity(node, {
      x: (Math.random() - 0.8) * 200,
      y: (Math.random() - 0.8) * 200
    });
  });

  setupMouseInteraction();
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
        node.style.width = styleConfig.desktop.node.width
        node.style.height = styleConfig.desktop.node.height
        node.style.position = 'absolute';
        node.style.fontSize = styleConfig.desktop.node.fontSize();
        node.style.borderRadius = styleConfig.desktop.node.borderRadius();
        node.style.padding = styleConfig.desktop.node.paddingSize();
        node.style.boxShadow = `0 0 ${styleConfig.desktop.defaultBoxShadowSize()} ${node.dataset.borderColor}`;
        node.querySelector('h2').style.fontSize = styleConfig.desktop.node.h2FontSize();
        node.querySelector('p').style.fontSize = styleConfig.desktop.node.pFontSize();
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

function handleMobileTouchStart(event) {
  touchStartPosition = {
    x: event.touches[0].clientX,
    y: event.touches[0].clientY
  };
  const node = event.currentTarget;
  if (node) {
    applyNodeTouchEffect(node, true);
  }
}

function handleMobileTouchEnd(event) {
  event.preventDefault();
  const node = event.currentTarget;
  if (node) {
    // Remove glow effect
    applyNodeTouchEffect(node, false);
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
    applyNodeTouchEffect(node, false);
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
    if (
      touchX < rect.left ||
      touchX > rect.right ||
      touchY < rect.top ||
      touchY > rect.bottom
    ) {
      // Touch moved outside the node, remove glow effect
      applyNodeTouchEffect(node, false);
    } else {
      // Touch is still within the node, ensure the glow effect is applied
      applyNodeTouchEffect(node, true);
    }
  }
}

function updateMobileLayout() {
  const network = document.getElementById('network');
  network.innerHTML = ''; // Clear existing nodes
  network.style.position = 'static';
  network.style.width = '100%';
  network.style.height = 'auto';
  network.style.padding = styleConfig.mobile.networkPadding;

  projects.forEach((project, index) => {
    const borderColor = colors[index];
    const { node } = createNode(project, borderColor);
    network.appendChild(node);

    // Apply mobile-specific styles
    node.style.position = 'static';
    node.style.marginBottom = styleConfig.mobile.nodeMarginBottom;
    node.style.transform = 'none';
    node.style.pointerEvents = 'auto'; // To enable touch events on mobile

    // Update font sizes
    updateNodeFontSizes(node);

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
  titleSubtitleContainer.style.padding = styleConfig.mobile.titleSubtitleContainerPadding;
  titleSubtitleContainer.style.marginBottom = styleConfig.mobile.titleSubtitleContainerMarginBottom;

  const mainTitle = document.getElementById('main-title');
  const mainSubtitle = document.getElementById('main-subtitle');
  mainTitle.style.fontSize = styleConfig.mobile.mainTitleFontSize;
  mainSubtitle.style.fontSize = styleConfig.mobile.mainSubtitleFontSize;

  const xIconContainer = document.getElementById('x-icon-container');
  const discordIconContainer = document.getElementById('discord-icon-container');
  xIconContainer.style.width = styleConfig.mobile.iconSize;
  xIconContainer.style.height = styleConfig.mobile.iconSize;
  discordIconContainer.style.width = styleConfig.mobile.iconSize;
  discordIconContainer.style.height = styleConfig.mobile.iconSize;
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
      const scaledWidth = scaleValue(body.plugin.project.width);
      const scaledHeight = scaleValue(body.plugin.project.height);

      // Scale the physics body
      Matter.Body.scale(body, scaledWidth / body.plugin.width, scaledHeight / body.plugin.height);

      // Update the plugin properties
      body.plugin.width = scaledWidth;
      body.plugin.height = scaledHeight;

      // Update the node's styles
      if (body.plugin.node) {
        const node = body.plugin.node;
        node.style.width = `${scaledWidth}px`;
        node.style.height = `${scaledHeight}px`;
        node.style.fontSize = styleConfig.desktop.node.fontSize();
        node.querySelector('h2').style.fontSize = styleConfig.desktop.node.h2FontSize();
        node.querySelector('p').style.fontSize = styleConfig.desktop.node.pFontSize();
        node.style.borderRadius = styleConfig.desktop.node.borderRadius();
        node.style.padding = styleConfig.desktop.node.paddingSize();
        node.style.boxShadow = `0 0 ${styleConfig.desktop.defaultBoxShadowSize()} ${node.dataset.borderColor}`;
      }
    }
  });
}

// Update main title and subtitle
function updateElementScaling() {
  const mainTitle = document.getElementById('main-title');
  const mainSubtitle = document.getElementById('main-subtitle');
  const xIconContainer = document.getElementById('x-icon-container');
  const discordIconContainer = document.getElementById('discord-icon-container');

  const config = isMobile ? styleConfig.mobile : styleConfig.desktop;

  mainTitle.style.fontSize = isMobile ? styleConfig.mobile.mainTitleFontSize : styleConfig.desktop.mainTitleFontSize();
  mainSubtitle.style.fontSize = isMobile ? styleConfig.mobile.mainSubtitleFontSize : styleConfig.desktop.mainSubtitleFontSize();

  if (!isMobile) {
    xIconContainer.style.width = config.iconSize();
    xIconContainer.style.height = config.iconSize();
    discordIconContainer.style.width = config.iconSize();
    discordIconContainer.style.height = config.iconSize();
  }

  // Update team text styles for all nodes
  nodes.forEach((body) => {
    if (body.plugin && body.plugin.node) {
      const teamIconDiv = body.plugin.node.querySelector('.team-icon');
      if (teamIconDiv) {
        Object.assign(teamIconDiv.style, getTeamIconStyles());

        const teamText = teamIconDiv.querySelector('span');
        if (teamText) {
          applyTeamTextStyles(teamText);
        }
      }
    }
  });
}

function handleElementHover(event) {
  if (!isDragging) {
    cursorGlow.style.boxShadow = styleConfig.cursorGlow.hoveredBoxShadow('rgba(38, 139, 217, 1)');
    cursorGlow.style.background = 'rgba(38, 139, 217, 1)';
    cursorGlow.classList.add('hovered');

    if (event.target.id === 'main-title-link') {
      const mainTitle = document.getElementById('main-title');
      mainTitle.style.filter = styleConfig.elementHover.brightness;
      mainTitle.style.textShadow = styleConfig.elementHover.textShadow();
    } else {
      const icon = event.target.querySelector('svg');
      if (icon) {
        icon.style.filter = `drop-shadow(0 0 ${styleConfig.desktop.iconDropShadowSize()} rgba(255, 255, 255, 0.8))`;
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
  cursorGlow.style.boxShadow = styleConfig.cursorGlow.defaultBoxShadow(scale);
  cursorGlow.style.background = styleConfig.cursorGlow.defaultBackground;
  cursorGlow.classList.remove('hovered');

  const mainTitle = document.getElementById('main-title');
  mainTitle.style.filter = '';
  mainTitle.style.textShadow = '';

  const icons = document.querySelectorAll('#x-icon, #discord-icon');
  icons.forEach(icon => icon.style.filter = '');
}

const colors = getDistinctColors(projects.length);
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
  updateScale();
  updateMobileStatus();
  updateCursorGlowVisibility();
  updateLayout();
  
  // Update node sizes and positions immediately
  nodes.forEach((body) => {
    updateNodeSize(body);
    updateNodePosition(body);
  });
});

// Ensure layout is initialized after the window loads
window.addEventListener('load', () => {
  updateScale();
  initializeLayout();
});
