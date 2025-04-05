
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
camera.position.set(0, 0, 5);

// Initialize container and renderer
const container = document.getElementById('vr-model-container');
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
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

// Create a glossy material for "halo" effect
const glowGeometry = new THREE.RingGeometry(1.5, 2, 32);
const glowMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x9500ff,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide
});
const glowRing = new THREE.Mesh(glowGeometry, glowMaterial);
glowRing.rotation.x = Math.PI / 2;
glowRing.position.z = -0.5;
scene.add(glowRing);

// Animation for the glow effect
gsap.to(glowRing.scale, {
    x: 1.2,
    y: 1.2,
    z: 1.2,
    duration: 2,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut"
});

// Initialize loader and variables
const loader = new GLTFLoader();
let vrHeadset;
let mixer;

// Define model positions for different sections
const sectionPositions = [
    {
        id: 'home',
        position: { x: 0, y: -0.5, z: 0 },
        rotation: { x: 0, y: 1.5, z: 0 },
        scale: 1.2
    },
    {
        id: 'designs',
        position: { x: 1, y: -0.5, z: -1 },
        rotation: { x: 0.3, y: -0.8, z: 0.1 },
        scale: 1
    },
    {
        id: 'about',
        position: { x: -1, y: -0.5, z: -1 },
        rotation: { x: 0.2, y: 0.8, z: 0 },
        scale: 1
    },
    {
        id: 'contact',
        position: { x: 0, y: -0.5, z: -1 },
        rotation: { x: 0.5, y: 0, z: 0 },
        scale: 0.8
    },
    {
        id: 'testimonials',
        position: { x: 0.5, y: -0.3, z: -0.5 },
        rotation: { x: -0.2, y: 1, z: 0.1 },
        scale: 1.1
    }
];

// Try to load the model
loader.load(
    './models/meta_quest_3_vr_headset..glb', // Adjust path as needed
    function(gltf) {
        vrHeadset = gltf.scene;
        
        // Apply materials and optimization
        vrHeadset.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                
                // Improve material quality if needed
                if (node.material) {
                    node.material.envMapIntensity = 1.5;
                    node.material.needsUpdate = true;
                }
            }
        });
        
        // Initial scale and position
        vrHeadset.scale.set(1, 1, 1);
        scene.add(vrHeadset);
        
        if (gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(vrHeadset);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
        } else {
            // Add a subtle rotation animation if no animations exist
            animateModel();
        }
        
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

// Fallback model creation function
function createFallbackModel() {
    // Create a stylized VR headset with basic shapes
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
    
    // Set as our model
    vrHeadset = headsetGroup;
    scene.add(vrHeadset);
    
    // Animate the fallback model
    animateModel();
    updateModelPosition();
}

// Subtle continuous animation
function animateModel() {
    if (!vrHeadset) return;
    
    gsap.to(vrHeadset.rotation, {
        y: vrHeadset.rotation.y + 0.2,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
    });
}

// Update model position based on visible section
function updateModelPosition() {
    if (!vrHeadset) return;
    
    const sections = document.querySelectorAll('.section');
    let currentSection = null;
    
    // Find the most visible section
    sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        
        if (visibleHeight > 0 && (!currentSection || visibleHeight > currentSection.visibleHeight)) {
            currentSection = {
                id: section.id,
                visibleHeight: visibleHeight
            };
        }
    });
    
    if (currentSection) {
        const targetPosition = sectionPositions.find(pos => pos.id === currentSection.id);
        
        if (targetPosition) {
            // Smooth transition to new position
            gsap.to(vrHeadset.position, {
                x: targetPosition.position.x,
                y: targetPosition.position.y,
                z: targetPosition.position.z,
                duration: 1.5,
                ease: "power2.out"
            });
            
            gsap.to(vrHeadset.rotation, {
                x: targetPosition.rotation.x,
                y: targetPosition.rotation.y,
                z: targetPosition.rotation.z,
                duration: 1.5,
                ease: "power2.out"
            });
            
            gsap.to(vrHeadset.scale, {
                x: targetPosition.scale,
                y: targetPosition.scale,
                z: targetPosition.scale,
                duration: 1.5,
                ease: "power2.out"
            });
            
            // Also move the glow ring
            gsap.to(glowRing.position, {
                x: targetPosition.position.x,
                y: targetPosition.position.y - 0.5,
                z: targetPosition.position.z - 0.5,
                duration: 1.5,
                ease: "power2.out"
            });
        }
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (mixer) {
        mixer.update(0.016); // ~60fps
    }
    
    // Subtle rotation of the glow ring
    glowRing.rotation.z += 0.005;
    
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

// Start animation loop
animate();

// Variables for testimonial slider
let currentSlideIndex = 0;
const slides = document.getElementsByClassName("testimonial-slide");
const dots = document.getElementsByClassName("dot");

// Add this to your existing JavaScript or add a new script tag before the closing body tag
document.addEventListener("DOMContentLoaded", function() {
  // Initialize testimonials
  showSlide(currentSlideIndex);
});

// Function to move slides
function moveSlide(n) {
  showSlide(currentSlideIndex += n);
}

// Function to set current slide
function currentSlide(n) {
  showSlide(currentSlideIndex = n);
}

// Function to display the appropriate slide
function showSlide(n) {
  // Get all slides and dots
  const slides = document.querySelector('.testimonial-slider');
  const dots = document.querySelectorAll('.dot');
  
  // Handle wrapping of slide index
  if (n > dots.length - 1) currentSlideIndex = 0;
  if (n < 0) currentSlideIndex = dots.length - 1;
  
  // Move the slider to show the current slide
  slides.style.transform = `translateX(-${currentSlideIndex * 33.333}%)`;
  
  // Update active dot
  dots.forEach((dot, index) => {
    dot.classList.remove('active');
    if (index === currentSlideIndex) {
      dot.classList.add('active');
    }
  });
}