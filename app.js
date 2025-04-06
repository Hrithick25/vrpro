import * as THREE from 'https://cdn.skypack.dev/three@0.129.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'https://cdn.skypack.dev/gsap';

// Initialize the scene
const scene = new THREE.Scene();
scene.background = null; // Transparent background

// Configure camera
const camera = new THREE.PerspectiveCamera(
    35, 
    window.innerWidth / window.innerHeight, 
    0.1, 
    1000
);
camera.position.set(0, 0, 4); // Moved closer to better see the smaller model

// Initialize container and renderer
const container = document.getElementById('vr-model-container');
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio,2);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Add lights for premium appearance
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 1);
spotLight.position.set(5, 5, 5);
spotLight.castShadow = true;
spotLight.shadow.bias = -0.0001;
scene.add(spotLight);

const rimLight = new THREE.DirectionalLight(0x9500ff, 1);
rimLight.position.set(-5, 5, -5);
scene.add(rimLight);

// Initialize loader and variables
const loader = new GLTFLoader();
let vrHeadset;
let mixer;
let controls;
let isUserInteracting = false;
let isHovering = false;
let isAnimating = false;
let pulseAnimation;
let hoverAnimation;
let floatAnimation;

// Define model positions for different sections
const sectionPositions = [
    {
        id: 'home',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 1.5, z: 0 },
        scale: 0.72
    },
    {
        id: 'designs',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0.3, y: -0.8, z: 0.1 },
        scale: 0.6
    },
    {
        id: 'about',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0.2, y: 0.8, z: 0 },
        scale: 0.6
    },
    {
        id: 'contact',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0.5, y: 0, z: 0 },
        scale: 0.5
    },
    {
        id: 'testimonials',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: -0.2, y: 1, z: 0.1 },
        scale: 0.66
    }
];

// Setup user interaction controls
function setupControls() {
    // Add orbit controls for mouse drag rotation
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false; // Disable zoom to prevent user from getting lost
    controls.enablePan = false;  // Disable panning
    controls.rotateSpeed = 0.5;  // Make rotation more gentle
    controls.maxPolarAngle = Math.PI * 0.65; // Limit vertical rotation
    controls.minPolarAngle = Math.PI * 0.35;
    
    // Enable/disable controls based on user interaction
    controls.addEventListener('start', function() {
        isUserInteracting = true;
        pauseAnimations();
    });
    
    controls.addEventListener('end', function() {
        isUserInteracting = false;
        if (!isHovering) {
            resumeAnimations();
        }
    });
}

// Raycaster for mouse hover interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Try to load the model
loader.load(
    './models/mr_headset_concept.glb', 
    function(gltf) {
        vrHeadset = gltf.scene;
        
        vrHeadset.traverse((node) => {
            if (node.isMesh) {
              if (node.material && node.material.map) {
                node.castShadow = true;
                node.receiveShadow = true;
                node.material.map.minFilter = THREE.LinearMipMapLinearFilter;
                node.material.map.magFilter = THREE.LinearFilter;
                node.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
                node.material.needsUpdate = true;
              }
            }
        });
        
        // Initial scale and position
        vrHeadset.scale.set(0.3, 0.3, 0.3);
        scene.add(vrHeadset);
        
        if (gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(vrHeadset);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
        } else {
            // Add animations
            setupAnimations();
        }
        
        // Setup user interactions
        setupControls();
        
        // Set initial position based on visible section
        updateModelPosition();
    },
    function(xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
        console.error('Error loading model:', error);
        // Create a fallback 3D object if model fails to load
        createFallbackModel();
    }
);

// Enhanced animations
function setupAnimations() {
    if (!vrHeadset) return;

    // Float animation (gentle up and down)
    floatAnimation = gsap.to(vrHeadset.position, {
        y: vrHeadset.position.y + 0.08,
        duration: 2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        paused: false
    });
    
    // Pulse animation (subtle scale pulsing)
    const originalScale = { value: vrHeadset.scale.x };
    pulseAnimation = gsap.to(originalScale, {
        value: originalScale.value * 1.05,
        duration: 1.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        paused: true,
        onUpdate: function() {
            if (vrHeadset) {
                vrHeadset.scale.set(
                    originalScale.value,
                    originalScale.value,
                    originalScale.value
                );
            }
        }
    });
    
    // The hover glow animation will be triggered on mouse hover
    // Add a custom property for glow intensity
    vrHeadset.userData.glowIntensity = 0;
}

// Pause all automatic animations
function pauseAnimations() {
    if (floatAnimation) floatAnimation.pause();
    if (pulseAnimation) pulseAnimation.pause();
    if (hoverAnimation) hoverAnimation.pause();
    isAnimating = false;
}

// Resume automatic animations
function resumeAnimations() {
    if (floatAnimation) floatAnimation.play();
    isAnimating = true;
}

// Handle mouse hover effects
function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    
    // Check for intersections
    if (vrHeadset) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(vrHeadset, true);
        
        if (intersects.length > 0) {
            if (!isHovering) {
                isHovering = true;
                
                // Pause regular animations
                pauseAnimations();
                
                // Start hover animation - scaled up slightly
                gsap.to(vrHeadset.scale, {
                    x: vrHeadset.scale.x * 1.1,
                    y: vrHeadset.scale.y * 1.1,
                    z: vrHeadset.scale.z * 1.1,
                    duration: 0.5,
                    ease: "back.out(1.5)"
                });
                
                // Make the rim light stronger for glow effect
                gsap.to(rimLight, {
                    intensity: 1.5,
                    duration: 0.3
                });
                
                // Change cursor
                document.body.style.cursor = 'pointer';
                
                // Add hint tooltip for user
                // showTooltip("Click to interact");
            }
        } else {
            if (isHovering) {
                isHovering = false;
                
                // Return to original scale with elastic effect
                gsap.to(vrHeadset.scale, {
                    x: vrHeadset.scale.x / 1.1,
                    y: vrHeadset.scale.y / 1.1,
                    z: vrHeadset.scale.z / 1.1,
                    duration: 0.5,
                    ease: "elastic.out(1, 0.3)"
                });
                
                // Reset rim light
                gsap.to(rimLight, {
                    intensity: 1,
                    duration: 0.3
                });
                
                // Reset cursor
                document.body.style.cursor = 'auto';
                
                // Hide tooltip
                // hideTooltip();
                
                // Resume animations if not user interacting
                if (!isUserInteracting) {
                    resumeAnimations();
                }
            }
        }
    }
}

// Handle mouse click on model
function onMouseClick(event) {
    if (vrHeadset && isHovering) {
        // Trigger a special animation on click
        
        // First stop any ongoing animations
        pauseAnimations();
        
        // Get current section
        const currentSectionId = getCurrentSectionId();
        
        // Do a 360 spin based on the current section
        const currentPosition = sectionPositions.find(pos => pos.id === currentSectionId);
        
        // Create a spectacular spin animation
        const spinDuration = 1.2;
        
        // First part - spin up and zoom
        gsap.timeline()
            .to(vrHeadset.rotation, {
                y: vrHeadset.rotation.y + Math.PI * 2,
                duration: spinDuration,
                ease: "power2.inOut"
            })
            .to(vrHeadset.position, {
                y: vrHeadset.position.y + 0.3,
                duration: spinDuration / 2,
                yoyo: true,
                repeat: 1,
                ease: "power1.out"
            }, 0) // Start at the same time
            .to(spotLight, {
                intensity: 1.5,
                duration: spinDuration / 4,
                yoyo: true,
                repeat: 3,
                ease: "sine.inOut"
            }, 0) // Start at the same time
            .call(function() {
                // Resume regular animations when done
                if (!isUserInteracting) {
                    resumeAnimations();
                }
            });
    }
}

// Show tooltip
// function showTooltip(text) {
//     let tooltip = document.getElementById('vr-model-tooltip');
//     if (!tooltip) {
//         tooltip = document.createElement('div');
//         tooltip.id = 'vr-model-tooltip';
//         tooltip.style.position = 'fixed';
//         tooltip.style.backgroundColor = 'rgba(0,0,0,0.7)';
//         tooltip.style.color = 'white';
//         tooltip.style.padding = '8px 12px';
//         tooltip.style.borderRadius = '4px';
//         tooltip.style.fontSize = '14px';
//         tooltip.style.pointerEvents = 'none';
//         tooltip.style.zIndex = '1000';
//         tooltip.style.transform = 'translate(-50%, -100%)';
//         tooltip.style.marginTop = '-10px';
//         document.body.appendChild(tooltip);
//     }
    
//     tooltip.innerText = text;
//     tooltip.style.display = 'block';
    
//     // Position tooltip to follow mouse
//     document.addEventListener('mousemove', positionTooltip);
// }

// Position tooltip to follow cursor
// function positionTooltip(e) {
//     const tooltip = document.getElementById('vr-model-tooltip');
//     if (tooltip) {
//         tooltip.style.left = e.clientX + 'px';
//         tooltip.style.top = e.clientY - 10 + 'px';
//     }
// }

// // Hide tooltip
// function hideTooltip() {
//     const tooltip = document.getElementById('vr-model-tooltip');
//     if (tooltip) {
//         tooltip.style.display = 'none';
//         document.removeEventListener('mousemove', positionTooltip);
//     }
// }

// Get current visible section ID
function getCurrentSectionId() {
    const sections = document.querySelectorAll('.section');
    let currentSection = null;
    let maxVisibleHeight = 0;
    
    sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        
        if (visibleHeight > maxVisibleHeight) {
            maxVisibleHeight = visibleHeight;
            currentSection = section.id;
        }
    });
    
    return currentSection || 'home'; // Default to home if nothing found
}

// Fallback model creation function
function createFallbackModel() {
    const headsetGroup = new THREE.Group();
    
    // Main body
    const bodyGeometry = new THREE.BoxGeometry(1.5, 0.8, 0.9);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x222222,
        shininess: 100,
        specular: 0x666666
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    headsetGroup.add(body);
    
    // Visor/screen
    const visorGeometry = new THREE.BoxGeometry(1.4, 0.7, 0.1);
    const visorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x000000,
        shininess: 150,
        specular: 0x9500ff
    });
    const visor = new THREE.Mesh(visorGeometry, visorMaterial);
    visor.position.z = 0.5;
    visor.castShadow = true;
    headsetGroup.add(visor);
    
    // Head strap
    const strapGeometry = new THREE.TorusGeometry(0.6, 0.1, 16, 32, Math.PI);
    const strapMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        shininess: 50
    });
    const strap = new THREE.Mesh(strapGeometry, strapMaterial);
    strap.rotation.x = Math.PI / 2;
    strap.position.z = -0.5;
    headsetGroup.add(strap);
    
    // Adjust scale
    headsetGroup.scale.set(0.3, 0.3, 0.3);

    // Set as our model
    vrHeadset = headsetGroup;
    scene.add(vrHeadset);
    
    // Setup animations & controls
    setupAnimations();
    setupControls();
    updateModelPosition();
}

// Update model position based on visible section
function updateModelPosition() {
    if (!vrHeadset) return;
    
    const currentSectionId = getCurrentSectionId();
    const targetPosition = sectionPositions.find(pos => pos.id === currentSectionId);
    
    if (targetPosition) {
        // Smooth transition to new position
        gsap.to(vrHeadset.position, {
            x: targetPosition.position.x,
            y: targetPosition.position.y,
            z: targetPosition.position.z,
            duration: 1.5,
            ease: "power2.inOut"
        });
        
        gsap.to(vrHeadset.rotation, {
            x: targetPosition.rotation.x,
            y: targetPosition.rotation.y,
            z: targetPosition.rotation.z,
            duration: 1.5,
            ease: "power2.inOut"
        });
        
        gsap.to(vrHeadset.scale, {
            x: targetPosition.scale,
            y: targetPosition.scale,
            z: targetPosition.scale,
            duration: 1.5,
            ease: "power2.inOut"
        });
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (mixer) {
        mixer.update(0.016); // ~60fps
    }
    
    if (controls) {
        controls.update(); // Update orbit controls
    }
    
    renderer.render(scene, camera);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Set up event listeners
window.addEventListener('resize', onWindowResize);
window.addEventListener('scroll', updateModelPosition);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', onMouseClick);

// Create initial pulsing effect when the page loads
setTimeout(function() {
    if (vrHeadset) {
        gsap.from(vrHeadset.scale, {
            x: 0.01,
            y: 0.01,
            z: 0.01,
            duration: 1.5,
            ease: "elastic.out(1, 0.3)"
        });
    }
}, 500);

// Start animation loop
animate();