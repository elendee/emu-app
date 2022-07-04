import {
	Vector2,
	Layers,
	ReinhardToneMapping,
	ShaderMaterial,
	DoubleSide,
	// BoxBufferGeometry,
	// MeshLambertMaterial,
	// Mesh,
	MeshBasicMaterial,
} from '/three-patch/build/three.module.js'

import GLOBAL from '../../GLOBAL.js?v=89'

import SCENE from './SCENE.js?v=89'
import CAMERA from './CAMERA.js?v=89'
import RENDERER from './RENDERER.js?v=89'

import BROKER from '../../EventBroker.js?v=89'

import {
	EffectComposer,
} from '/three-patch/examples/jsm/postprocessing/EffectComposer.js?v=89'
import { ShaderPass } from '/three-patch/examples/jsm/postprocessing/ShaderPass.js?v=89'
import { RenderPass } from '/three-patch/examples/jsm/postprocessing/RenderPass.js?v=89'
import { UnrealBloomPass } from '/three-patch/examples/jsm/postprocessing/UnrealBloomPass.js?v=89'




// const vshader = document.createElement('script')
// vshader.type = 'x-shader/x-vertex'
// vshader.id = 'vertexshader'
// vshader.innerHTML = 
const vshader = `
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`
// document.body.appendChild( vshader )

const fshader = `
uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;
varying vec2 vUv;
void main() {
	gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
}`
// document.body.appendChild( fshader )

const bloom_params = {
	// exposure: 1,
	strength: 2,
	threshold: .2,
	radius: 0,
}

const BLOOM_LAYER = 1
// const DEFAULT_LAYER = 0

const bloomLayer = new Layers();
bloomLayer.set( BLOOM_LAYER );

const bloomComposer = new EffectComposer( RENDERER )
window.bloomComposer = bloomComposer

const renderScene = new RenderPass( SCENE, CAMERA )

RENDERER.toneMapping = ReinhardToneMapping;





const bloomPass = new UnrealBloomPass( new Vector2( 
	window.innerWidth / GLOBAL.RENDER.RESOLUTIONS[ GLOBAL.RENDER.RES_KEY ], 
	window.innerHeight / GLOBAL.RENDER.RESOLUTIONS[ GLOBAL.RENDER.RES_KEY ] 
), 0, 0, 0 ); // 1.5, 0.4, 0.85
bloomPass.threshold = bloom_params.threshold
bloomPass.strength = bloom_params.strength;
bloomPass.radius = bloom_params.radius;

bloomComposer.renderToScreen = false
bloomComposer.addPass( renderScene )
bloomComposer.addPass( bloomPass )





const finalPass = new ShaderPass(
	new ShaderMaterial( {
		uniforms: {
			baseTexture: { 
				value: null 
			},
			bloomTexture: { 
				value: bloomComposer.renderTarget2.texture 
			}
		},
		vertexShader: vshader,
		// document.getElementById( 'vertexshader' ).textContent,
		fragmentShader: fshader,
		// document.getElementById( 'fragmentshader' ).textContent,
		defines: {}
	} ), "baseTexture"
);
finalPass.needsSwap = true;




const finalComposer = new EffectComposer( RENDERER );
finalComposer.addPass( renderScene )
finalComposer.addPass( finalPass )

window.finalComposer = finalComposer








const darkMaterial = new MeshBasicMaterial( { color: 'black', side: DoubleSide } );
const materials = {}



function darkenNonBloomed( obj ) {
	if( obj.type === 'sun'){
		for( const child of obj.children ){
			if( child.bloom ) continue
			materials[ child.uuid ] = child.material;
			child.material = darkMaterial;			
			// debugger
		}
	}else 
	if (  obj.isMesh && bloomLayer.test( obj.layers ) === false ) { //   / 
		materials[ obj.uuid ] = obj.material;
		obj.material = darkMaterial;
	}
}

function restoreMaterial( obj ) {
	if( obj.type === 'sun'){
		for( const child of obj.children ){
			if( child.bloom ) continue
			child.material = materials[ child.uuid ];
			delete materials[ child.uuid ];
		}
	}else 
	if ( materials[ obj.uuid ] ) {
		obj.material = materials[ obj.uuid ];
		delete materials[ obj.uuid ];
	}
}





const composeAnimate = () => {

	SCENE.traverse( darkenNonBloomed )
    bloomComposer.render()
    // debugger

	SCENE.traverse( restoreMaterial )
    finalComposer.render()

}


const addBloom = window.addBloom = obj => {

	obj.layers.enable( BLOOM_LAYER )
	materials[ obj.uuid ] = obj.material

}

const removeBloom = window.removeBloom = obj => {

	obj.layers.disable( BLOOM_LAYER )
	delete materials[ obj.uuid ]

}



const composer_res = () => {

	finalComposer.setSize( 
		window.innerWidth / GLOBAL.RENDER.RESOLUTIONS[ GLOBAL.RENDER.RES_KEY ],
		window.innerWidth / GLOBAL.RENDER.RESOLUTIONS[ GLOBAL.RENDER.RES_KEY ],
		false,
	)
	bloomComposer.setSize( 
		window.innerWidth / GLOBAL.RENDER.RESOLUTIONS[ GLOBAL.RENDER.RES_KEY ],
		window.innerWidth / GLOBAL.RENDER.RESOLUTIONS[ GLOBAL.RENDER.RES_KEY ],
		false,
	)

}

const composer_intensity = event => {
	const { modifier } = event 
	if( typeof event.set_to === 'number' ){
		bloomPass.strength = event.set_to
	}else{
		if( typeof modifier === 'number' ){
			bloomPass.strength *= modifier
		}else{
			bloomPass.strength = bloom_params.strength
		}		
	}
}

const composer_radius = event => {
	const { modifier } = event 
	if( typeof modifier === 'number' ){
		bloomPass.radius *= modifier
	}else{
		bloomPass.radius = bloom_params.radius
	}
}


// CAMERA.layers.enable( BLOOM_LAYER )
BROKER.subscribe('COMPOSER_RES', composer_res )
BROKER.subscribe('COMPOSER_INTENSITY', composer_intensity )
BROKER.subscribe('COMPOSER_RADIUS', composer_radius )


export {
	composeAnimate,
	addBloom,
	removeBloom,
}

