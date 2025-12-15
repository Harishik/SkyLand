/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MapControls, Environment, Float, Outlines, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { MathUtils } from 'three';
import { Grid, BuildingType, TileData } from '../types';
import { GRID_SIZE, BUILDINGS } from '../constants';

// Fix for TypeScript not recognizing R3F elements in JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      boxGeometry: any;
      coneGeometry: any;
      cylinderGeometry: any;
      directionalLight: any;
      group: any;
      instancedMesh: any;
      mesh: any;
      meshBasicMaterial: any;
      meshStandardMaterial: any;
      planeGeometry: any;
      sphereGeometry: any;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      boxGeometry: any;
      coneGeometry: any;
      cylinderGeometry: any;
      directionalLight: any;
      group: any;
      instancedMesh: any;
      mesh: any;
      meshBasicMaterial: any;
      meshStandardMaterial: any;
      planeGeometry: any;
      sphereGeometry: any;
    }
  }
}

// --- Constants & Helpers ---
const WORLD_OFFSET = GRID_SIZE / 2 - 0.5;
const gridToWorld = (x: number, y: number) => [x - WORLD_OFFSET, 0, y - WORLD_OFFSET] as [number, number, number];

const getHash = (x: number, y: number) => Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
const getRandomRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Shared Geometries
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
const coneGeo = new THREE.ConeGeometry(1, 1, 4); // Pyramid with 4 sides
const sphereGeo = new THREE.SphereGeometry(1, 8, 8);

// --- 1. Procedural Buildings ---

const WindowBlock = React.memo(({ position, scale, color = "#bfdbfe" }: { position: [number, number, number], scale: [number, number, number], color?: string }) => (
  <mesh geometry={boxGeo} position={position} scale={scale}>
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.1} metalness={0.8} />
  </mesh>
));

const SmokeStack = ({ position, scale = [0.2, 1, 0.2] }: { position: [number, number, number], scale?: [number, number, number] }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.children.forEach((child, i) => {
        const cloud = child as THREE.Mesh;
        cloud.position.y += 0.01 + i * 0.005;
        cloud.scale.addScalar(0.005);
        
        const material = cloud.material as THREE.MeshStandardMaterial;
        if (material) {
          material.opacity -= 0.005;
          if (cloud.position.y > 1.5) {
            cloud.position.y = 0;
            cloud.scale.setScalar(0.1 + Math.random() * 0.1);
            material.opacity = 0.6;
          }
        }
      });
    }
  });

  return (
    <group position={position}>
      <mesh geometry={cylinderGeo} castShadow receiveShadow position={[0, scale[1]/2, 0]} scale={scale}>
        <meshStandardMaterial color="#4b5563" />
      </mesh>
      <group ref={ref} position={[0, scale[1], 0]}>
        {[0, 1, 2].map(i => (
          <mesh key={i} geometry={sphereGeo} position={[Math.random()*0.1, i*0.4, Math.random()*0.1]} scale={0.2}>
            <meshStandardMaterial color="#d1d5db" transparent opacity={0.6} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
};

interface BuildingMeshProps {
  type: BuildingType;
  baseColor: string;
  x: number;
  y: number;
  opacity?: number;
  transparent?: boolean;
  level?: number;
}

const ProceduralBuilding = React.memo(({ type, baseColor, x, y, opacity = 1, transparent = false, level = 1 }: BuildingMeshProps) => {
  const hash = getHash(x, y);
  const variant = Math.floor(hash * 100); 
  const rotation = Math.floor(hash * 4) * (Math.PI / 2);
  const randA = (hash * 17.123) % 1; 
  const randB = (hash * 91.345) % 1;

  const color = useMemo(() => {
    const c = new THREE.Color(baseColor);
    c.offsetHSL(hash * 0.1 - 0.05, 0, hash * 0.2 - 0.1);
    return c;
  }, [baseColor, hash]);

  const mainMat = useMemo(() => new THREE.MeshStandardMaterial({ color, flatShading: true, opacity, transparent, roughness: 0.8 }), [color, opacity, transparent]);
  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.7), flatShading: true, opacity, transparent }), [color, opacity, transparent]);
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.5).offsetHSL(0,0,-0.1), flatShading: true, opacity, transparent }), [color, opacity, transparent]);
  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#93c5fd', roughness: 0.2, metalness: 0.8, opacity: 0.9, transparent: true }), []);

  const commonProps = { castShadow: true, receiveShadow: true };
  const yOffset = -0.3;
  const levelScaleY = 1 + (level - 1) * 0.2; 

  return (
    <group rotation={[0, rotation, 0]} position={[0, yOffset, 0]} scale={[1, levelScaleY, 1]}>
      {(() => {
        switch (type) {
          case BuildingType.Residential:
            // 5 Variations of Residential
            if (variant < 20) {
              // 1. Classic Cottage
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.3, 0]} scale={[0.7, 0.6, 0.6]} />
                  <mesh {...commonProps} material={roofMat} geometry={coneGeo} position={[0, 0.75, 0]} scale={[0.6, 0.4, 0.6]} rotation={[0, Math.PI/4, 0]} />
                  <WindowBlock position={[0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                  <WindowBlock position={[-0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                  <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[0.2, 0.7, 0.15]} scale={[0.1, 0.4, 0.1]} />
                </>
              );
            } else if (variant < 40) {
              // 2. Modern Box Home
              const height = 0.6 + randA * 0.3;
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[-0.1, height/2, 0]} scale={[0.6, height, 0.8]} />
                  <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[0.25, height/2 - 0.1, 0.1]} scale={[0.4, height*0.8, 0.6]} />
                  <WindowBlock position={[-0.1, height - 0.2, 0.41]} scale={[0.4, 0.2, 0.05]} />
                  <mesh {...commonProps} material={glassMat} geometry={boxGeo} position={[0.25, 0.3, 0.42]} scale={[0.3, 0.4, 0.05]} />
                </>
              );
            } else if (variant < 60) {
               // 3. Row Houses (Duplex)
               return (
                  <>
                     <group position={[-0.2, 0, 0]}>
                        <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.4, 0]} scale={[0.35, 0.8, 0.7]} />
                        <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0, 0.85, 0]} scale={[0.38, 0.1, 0.75]} />
                        <WindowBlock position={[0, 0.5, 0.36]} scale={[0.2, 0.2, 0.05]} />
                        <WindowBlock position={[0, 0.2, 0.36]} scale={[0.2, 0.2, 0.05]} />
                     </group>
                     <group position={[0.2, 0, 0]}>
                        <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[0, 0.4, 0]} scale={[0.35, 0.8, 0.7]} />
                        <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0, 0.85, 0]} scale={[0.38, 0.1, 0.75]} />
                        <WindowBlock position={[0, 0.5, 0.36]} scale={[0.2, 0.2, 0.05]} />
                        <WindowBlock position={[0, 0.2, 0.36]} scale={[0.2, 0.2, 0.05]} />
                     </group>
                  </>
               )
            } else if (variant < 80) {
              // 4. L-Shaped Apartment
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[-0.15, 0.6, -0.15]} scale={[0.5, 1.2, 0.5]} />
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0.15, 0.5, 0.15]} scale={[0.5, 1.0, 0.5]} />
                  <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[-0.15, 1.22, -0.15]} scale={[0.52, 0.05, 0.52]} />
                  <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0.15, 1.02, 0.15]} scale={[0.52, 0.05, 0.52]} />
                  {/* Balconies */}
                  <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[-0.15, 0.8, 0.11]} scale={[0.3, 0.05, 0.05]} />
                  <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[0.15, 0.7, 0.41]} scale={[0.3, 0.05, 0.05]} />
                </>
              );
            } else {
              // 5. Luxury Tower (Cylindrical or Octagonal)
              return (
                <>
                    <mesh {...commonProps} material={mainMat} geometry={cylinderGeo} position={[0, 0.8, 0]} scale={[0.35, 1.6, 0.35]} />
                    <mesh {...commonProps} material={glassMat} geometry={cylinderGeo} position={[0, 0.8, 0]} scale={[0.36, 1.0, 0.36]} />
                    <mesh {...commonProps} material={roofMat} geometry={cylinderGeo} position={[0, 1.65, 0]} scale={[0.38, 0.1, 0.38]} />
                    {/* Rings */}
                    <mesh {...commonProps} material={accentMat} geometry={cylinderGeo} position={[0, 0.4, 0]} scale={[0.4, 0.05, 0.4]} />
                    <mesh {...commonProps} material={accentMat} geometry={cylinderGeo} position={[0, 0.8, 0]} scale={[0.4, 0.05, 0.4]} />
                    <mesh {...commonProps} material={accentMat} geometry={cylinderGeo} position={[0, 1.2, 0]} scale={[0.4, 0.05, 0.4]} />
                </>
              )
            }

          case BuildingType.Commercial:
            if (variant < 25) {
              // 1. Corner Store
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.35, 0]} scale={[0.8, 0.7, 0.8]} />
                  <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0, 0.75, 0]} scale={[0.85, 0.1, 0.85]} />
                  <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[0, 0.85, 0]} scale={[0.8, 0.1, 0.8]} />
                  {/* Awning */}
                  <mesh {...commonProps} material={new THREE.MeshStandardMaterial({ color: randA > 0.5 ? '#ef4444' : '#3b82f6' })} geometry={boxGeo} position={[0, 0.5, 0.42]} scale={[0.8, 0.1, 0.2]} rotation={[Math.PI/6, 0, 0]} />
                  <WindowBlock position={[0, 0.25, 0.41]} scale={[0.6, 0.3, 0.05]} color="#ffffff" />
                </>
              );
            } else if (variant < 50) {
              // 2. Mid-Rise Office
              const h = 1.2 + randA * 0.4;
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, h/2, 0]} scale={[0.7, h, 0.7]} />
                  {/* Vertical stripes of windows */}
                  <mesh {...commonProps} material={glassMat} geometry={boxGeo} position={[-0.2, h/2, 0.36]} scale={[0.15, h-0.2, 0.05]} />
                  <mesh {...commonProps} material={glassMat} geometry={boxGeo} position={[0.0, h/2, 0.36]} scale={[0.15, h-0.2, 0.05]} />
                  <mesh {...commonProps} material={glassMat} geometry={boxGeo} position={[0.2, h/2, 0.36]} scale={[0.15, h-0.2, 0.05]} />
                  <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[0, h+0.05, 0]} scale={[0.5, 0.1, 0.5]} />
                </>
              );
            } else if (variant < 75) {
               // 3. Modern Tech Hub (Split levels)
               return (
                   <>
                     <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[-0.15, 0.5, 0.1]} scale={[0.5, 1.0, 0.6]} />
                     <mesh {...commonProps} material={glassMat} geometry={boxGeo} position={[0.15, 0.4, -0.1]} scale={[0.5, 0.8, 0.6]} />
                     <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[0, 0.2, 0]} scale={[0.2, 0.4, 0.2]} /> {/* Connector */}
                     <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[-0.15, 1.02, 0.1]} scale={[0.4, 0.05, 0.5]} />
                   </>
               )
            } else {
              // 4. Skyscraper (Tapered)
              const h = 1.8 + randB * 0.5;
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, h/3, 0]} scale={[0.7, h/1.5, 0.7]} />
                  <mesh {...commonProps} material={glassMat} geometry={boxGeo} position={[0, h*0.75, 0]} scale={[0.5, h/2, 0.5]} />
                  <mesh {...commonProps} material={accentMat} geometry={cylinderGeo} position={[0, h, 0]} scale={[0.05, 0.5, 0.05]} />
                </>
               )
            }

          case BuildingType.Industrial:
            if (variant < 33) {
              // 1. Old Factory (Sawtooth roof)
              return (
                <group>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.3, 0]} scale={[0.9, 0.6, 0.8]} />
                  {/* Sawtooth Roofs */}
                  <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[-0.25, 0.7, 0]} scale={[0.3, 0.3, 0.8]} rotation={[0,0,Math.PI/4]} />
                  <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0.0, 0.7, 0]} scale={[0.3, 0.3, 0.8]} rotation={[0,0,Math.PI/4]} />
                  <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0.25, 0.7, 0]} scale={[0.3, 0.3, 0.8]} rotation={[0,0,Math.PI/4]} />
                  <SmokeStack position={[0.35, 0.3, 0.3]} />
                </group>
              );
            } else if (variant < 66) {
              // 2. Refinery (Tanks and Pipes)
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[-0.2, 0.1, 0]} scale={[0.4, 0.2, 0.9]} />
                  <mesh {...commonProps} material={accentMat} geometry={cylinderGeo} position={[0.2, 0.3, -0.2]} scale={[0.25, 0.6, 0.25]} />
                  <mesh {...commonProps} material={accentMat} geometry={cylinderGeo} position={[0.2, 0.3, 0.2]} scale={[0.25, 0.6, 0.25]} />
                  {/* Pipes */}
                  <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#64748b'})} geometry={cylinderGeo} position={[0, 0.4, -0.2]} scale={[0.05, 0.4, 0.05]} rotation={[0,0,Math.PI/2]} />
                  <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#64748b'})} geometry={cylinderGeo} position={[0, 0.2, 0.2]} scale={[0.05, 0.4, 0.05]} rotation={[0,0,Math.PI/2]} />
                  <SmokeStack position={[-0.3, 0.5, 0]} scale={[0.08, 1.2, 0.08]} />
                </>
              );
            } else {
               // 3. Warehouse & Shipping
               return (
                 <>
                   <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.25, -0.1]} scale={[0.9, 0.5, 0.6]} />
                   <mesh {...commonProps} material={roofMat} geometry={cylinderGeo} position={[0, 0.5, -0.1]} scale={[0.45, 0.9, 0.45]} rotation={[Math.PI/2, 0, 0]} />
                   {/* Crates */}
                   <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#b45309'})} geometry={boxGeo} position={[-0.3, 0.1, 0.35]} scale={[0.15, 0.15, 0.15]} />
                   <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#1e3a8a'})} geometry={boxGeo} position={[-0.1, 0.1, 0.35]} scale={[0.15, 0.15, 0.15]} />
                   <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#b91c1c'})} geometry={boxGeo} position={[-0.2, 0.25, 0.35]} scale={[0.15, 0.15, 0.15]} />
                 </>
               )
            }

          case BuildingType.Park:
            const treeCount = 1 + Math.floor(hash * 4);
            const positions = [[-0.25, -0.25], [0.25, 0.25], [-0.25, 0.25], [0.25, -0.25]];
            const parkVariant = variant % 3;
            
            return (
              <group position={[0, -yOffset - 0.29, 0]}>
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                    <planeGeometry args={[0.9, 0.9]} />
                    <meshStandardMaterial color={parkVariant === 0 ? "#86efac" : (parkVariant === 1 ? "#4ade80" : "#dcfce7")} />
                </mesh>
                
                {parkVariant === 0 && (
                    // 1. Fountain Park
                    <group>
                        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
                             <planeGeometry args={[0.5, 0.5]} />
                             <meshStandardMaterial color="#cbd5e1" />
                        </mesh>
                        <group position={[0,0.05,0]}>
                            <mesh material={new THREE.MeshStandardMaterial({color: '#94a3b8'})} geometry={cylinderGeo} scale={[0.3, 0.1, 0.3]} castShadow receiveShadow />
                            <mesh material={new THREE.MeshStandardMaterial({color: '#3b82f6', roughness: 0.1})} geometry={cylinderGeo} position={[0, 0.06, 0]} scale={[0.2, 0.05, 0.2]} />
                             <mesh material={new THREE.MeshStandardMaterial({color: '#bfdbfe', opacity: 0.6, transparent: true})} geometry={cylinderGeo} position={[0, 0.15, 0]} scale={[0.02, 0.25, 0.02]} />
                        </group>
                    </group>
                )}
                {parkVariant === 1 && (
                    // 2. Playground
                    <group>
                        <mesh position={[0.2, 0.05, 0.2]} geometry={cylinderGeo} scale={[0.25, 0.05, 0.25]} receiveShadow>
                             <meshStandardMaterial color="#fcd34d" />
                        </mesh>
                        <group position={[-0.2, 0, -0.2]}>
                             <mesh material={new THREE.MeshStandardMaterial({color: '#ef4444'})} geometry={boxGeo} position={[0, 0.15, -0.1]} scale={[0.08, 0.4, 0.02]} rotation={[Math.PI/3, 0, 0]} />
                        </group>
                    </group>
                )}
                {parkVariant === 2 && (
                    // 3. Flower Garden
                     <group>
                        {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map((pos, i) => (
                             <group key={i} position={[pos[0], 0, pos[1]]}>
                                 <mesh position={[0, 0.05, 0]} geometry={sphereGeo} scale={0.06}>
                                     <meshStandardMaterial color={i % 2 === 0 ? '#f472b6' : '#c084fc'} />
                                 </mesh>
                             </group>
                        ))}
                         <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
                             <planeGeometry args={[0.2, 0.9]} />
                             <meshStandardMaterial color="#d6d3d1" />
                         </mesh>
                         <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
                             <planeGeometry args={[0.9, 0.2]} />
                             <meshStandardMaterial color="#d6d3d1" />
                         </mesh>
                     </group>
                )}
                
                {/* Random Trees */}
                {Array.from({length: treeCount}).map((_, i) => {
                    const pos = positions[i % positions.length];
                    if (parkVariant === 0 && Math.abs(pos[0]) < 0.2 && Math.abs(pos[1]) < 0.2) return null; // Avoid fountain
                    const scale = 0.5 + getHash(x+i, y-i) * 0.5;
                    const treeColor = new THREE.Color("#166534").offsetHSL(0, 0, getHash(x,y+i)*0.2);
                    return (
                    <group key={i} position={[pos[0], 0, pos[1]]} scale={scale} rotation={[0, getHash(i,x)*Math.PI, 0]}>
                        <mesh castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: '#78350f' })} geometry={cylinderGeo} position={[0, 0.15, 0]} scale={[0.1, 0.3, 0.1]} />
                        <mesh castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: treeColor, flatShading: true })} geometry={coneGeo} position={[0, 0.4, 0]} scale={[0.4, 0.5, 0.4]} />
                        <mesh castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: treeColor, flatShading: true })} geometry={coneGeo} position={[0, 0.65, 0]} scale={[0.3, 0.4, 0.3]} />
                    </group>
                    )
                })}
              </group>
            );

        case BuildingType.School:
          // 1. Classic U-Shape
          const isUshape = randA > 0.5;
          return (
             <>
               <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[-0.2, 0.3, 0]} scale={[0.4, 0.6, 0.8]} />
               <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0.2, 0.3, 0]} scale={[0.4, 0.6, 0.8]} />
               <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.3, isUshape ? -0.2 : 0]} scale={[0.8, 0.6, 0.4]} />
               <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[-0.2, 0.65, 0]} scale={[0.45, 0.1, 0.85]} />
               <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0.2, 0.65, 0]} scale={[0.45, 0.1, 0.85]} />
               <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0, 0.65, isUshape ? -0.2 : 0]} scale={[0.85, 0.1, 0.45]} />
               {/* Clock Tower */}
               <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#9ca3af'})} geometry={cylinderGeo} position={[0, 0.4, 0.3]} scale={[0.08, 0.8, 0.08]} />
               <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#ef4444'})} geometry={boxGeo} position={[0.08, 0.7, 0.3]} scale={[0.15, 0.1, 0.01]} />
               <WindowBlock position={[0, 0.7, 0.34]} scale={[0.05, 0.05, 0.01]} color="#ffffff" />
             </>
          );

        case BuildingType.Hospital:
           // 1. H-Shape or Cross
           const hasHelipad = randA > 0.3;
           return (
             <>
               <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.6, 0]} scale={[0.5, 1.2, 0.5]} />
               <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.4]} />
               <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.4, 0]} scale={[0.4, 0.8, 0.9]} />
               <group position={[0, 1, 0.26]}>
                 <mesh material={new THREE.MeshStandardMaterial({color: '#ef4444'})} geometry={boxGeo} scale={[0.2, 0.05, 0.02]} />
                 <mesh material={new THREE.MeshStandardMaterial({color: '#ef4444'})} geometry={boxGeo} scale={[0.05, 0.2, 0.02]} />
               </group>
                {hasHelipad && (
                    <>
                        <mesh {...commonProps} material={accentMat} geometry={cylinderGeo} position={[0.25, 1.25, 0.25]} scale={[0.3, 0.1, 0.3]} />
                        <mesh material={new THREE.MeshStandardMaterial({color: '#ef4444'})} geometry={boxGeo} position={[0.25, 1.31, 0.25]} scale={[0.2, 0.02, 0.05]} />
                        <mesh material={new THREE.MeshStandardMaterial({color: '#ef4444'})} geometry={boxGeo} position={[0.25, 1.31, 0.25]} scale={[0.05, 0.02, 0.2]} />
                    </>
                )}
             </>
           );
        
        case BuildingType.Entertainment:
           if (randA > 0.5) {
                // 1. Cinema
                return (
                    <>
                        <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.4, 0.1]} scale={[0.8, 0.8, 0.6]} />
                        <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#fbbf24', emissive: '#fbbf24', emissiveIntensity: 0.5})} geometry={boxGeo} position={[0, 0.6, 0.45]} scale={[0.9, 0.2, 0.2]} />
                        <mesh {...commonProps} material={roofMat} geometry={cylinderGeo} position={[0, 0.8, 0.1]} scale={[0.4, 0.2, 0.6]} rotation={[Math.PI/2, 0, 0]} />
                    </>
                )
           } else {
               // 2. Casino / Club
               return (
                   <>
                       <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#4c1d95'})} geometry={boxGeo} position={[0, 0.3, 0]} scale={[0.8, 0.6, 0.8]} />
                       <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#8b5cf6'})} geometry={boxGeo} position={[0, 0.7, 0]} scale={[0.5, 0.4, 0.5]} />
                       {/* Neon strips */}
                       <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#f472b6', emissive: '#f472b6', emissiveIntensity: 2})} geometry={boxGeo} position={[0, 0.55, 0.41]} scale={[0.6, 0.05, 0.05]} />
                       <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#22d3ee', emissive: '#22d3ee', emissiveIntensity: 2})} geometry={boxGeo} position={[0, 0.8, 0.26]} scale={[0.3, 0.05, 0.05]} />
                       <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#22d3ee', emissive: '#22d3ee', emissiveIntensity: 2})} geometry={cylinderGeo} position={[0.3, 0.9, -0.3]} scale={[0.05, 1, 0.05]} />
                   </>
               )
           }

          case BuildingType.Road:
             return null;
          default:
            return null;
        }
      })()}
    </group>
  );
});

// --- 2. Dynamic Systems (Traffic, Citizens, Environment) ---

const carColors = ['#ef4444', '#3b82f6', '#eab308', '#ffffff', '#1f2937', '#f97316'];

const TrafficSystem = ({ grid }: { grid: Grid }) => {
  const roadTiles = useMemo(() => {
    const roads: {x: number, y: number}[] = [];
    grid.forEach(row => row.forEach(tile => {
      if (tile.buildingType === BuildingType.Road) roads.push({x: tile.x, y: tile.y});
    }));
    return roads;
  }, [grid]);

  const carCount = Math.min(roadTiles.length, 30);
  const carsRef = useRef<THREE.InstancedMesh>(null);
  const carsState = useRef<Float32Array>(new Float32Array(0)); 
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useEffect(() => {
    if (roadTiles.length < 2) return;
    carsState.current = new Float32Array(carCount * 6);
    const newColors = new Float32Array(carCount * 3);

    for (let i = 0; i < carCount; i++) {
      const startNode = roadTiles[Math.floor(Math.random() * roadTiles.length)];
      carsState.current[i*6 + 0] = startNode.x;
      carsState.current[i*6 + 1] = startNode.y;
      carsState.current[i*6 + 2] = startNode.x;
      carsState.current[i*6 + 3] = startNode.y;
      carsState.current[i*6 + 4] = 1; 
      carsState.current[i*6 + 5] = getRandomRange(0.01, 0.03); 

      const color = new THREE.Color(carColors[Math.floor(Math.random() * carColors.length)]);
      newColors[i*3] = color.r; newColors[i*3+1] = color.g; newColors[i*3+2] = color.b;
    }

    if (carsRef.current) {
        carsRef.current.instanceColor = new THREE.InstancedBufferAttribute(newColors, 3);
        carsRef.current.instanceColor.needsUpdate = true;
    }
  }, [roadTiles, carCount]);

  useFrame(() => {
    if (!carsRef.current || roadTiles.length < 2 || carsState.current.length === 0) return;

    for (let i = 0; i < carCount; i++) {
      const idx = i * 6;
      let curX = carsState.current[idx];
      let curY = carsState.current[idx+1];
      let tarX = carsState.current[idx+2];
      let tarY = carsState.current[idx+3];
      let progress = carsState.current[idx+4];
      const speed = carsState.current[idx+5];

      progress += speed;

      if (progress >= 1) {
        curX = tarX;
        curY = tarY;
        progress = 0;
        
        const neighbors = roadTiles.filter(t => 
          (Math.abs(t.x - curX) === 1 && t.y === curY) || 
          (Math.abs(t.y - curY) === 1 && t.x === curX)
        );

        if (neighbors.length > 0) {
            const valid = neighbors.length > 1 
                ? neighbors.filter(n => Math.abs(n.x - carsState.current[idx]) > 0.1 || Math.abs(n.y - carsState.current[idx+1]) > 0.1)
                : neighbors;
            
            const next = valid.length > 0 
                ? valid[Math.floor(Math.random() * valid.length)]
                : neighbors[0];
            
            tarX = next.x;
            tarY = next.y;
        } else {
            const rnd = roadTiles[Math.floor(Math.random() * roadTiles.length)];
            curX = rnd.x; curY = rnd.y; tarX = rnd.x; tarY = rnd.y;
        }
      }

      carsState.current[idx] = curX;
      carsState.current[idx+1] = curY;
      carsState.current[idx+2] = tarX;
      carsState.current[idx+3] = tarY;
      carsState.current[idx+4] = progress;

      const gx = MathUtils.lerp(curX, tarX, progress);
      const gy = MathUtils.lerp(curY, tarY, progress);

      const dx = tarX - curX;
      const dy = tarY - curY;
      const angle = Math.atan2(dy, dx);
      
      const offsetAmt = 0.15;
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      const offX = (-dy/len) * offsetAmt;
      const offY = (dx/len) * offsetAmt;

      const [wx, _, wz] = gridToWorld(gx + offX, gy + offY);

      dummy.position.set(wx, -0.3 + 0.075, wz);
      dummy.rotation.set(0, -angle, 0);
      dummy.scale.set(0.5, 0.15, 0.3); 
      
      dummy.updateMatrix();
      carsRef.current.setMatrixAt(i, dummy.matrix);
    }
    carsRef.current.instanceMatrix.needsUpdate = true;
  });

  if (roadTiles.length < 2) return null;

  return (
    <instancedMesh ref={carsRef} args={[boxGeo, undefined, carCount]} castShadow>
      <meshStandardMaterial roughness={0.5} metalness={0.3} />
    </instancedMesh>
  );
};

const clothesColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'];

const PopulationSystem = ({ population, grid }: { population: number, grid: Grid }) => {
    const agentCount = Math.min(Math.floor(population / 2), 300); 
    const meshRef = useRef<THREE.InstancedMesh>(null);
    
    const walkableTiles = useMemo(() => {
        const tiles: {x: number, y: number}[] = [];
        grid.forEach(row => row.forEach(tile => {
          if (tile.buildingType === BuildingType.Road || tile.buildingType === BuildingType.Park || tile.buildingType === BuildingType.None) {
            tiles.push({x: tile.x, y: tile.y});
          }
        }));
        return tiles;
    }, [grid]);
    
    const agentsState = useRef<Float32Array>(new Float32Array(0));
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    useEffect(() => {
        if (agentCount === 0 || walkableTiles.length === 0) return;
        agentsState.current = new Float32Array(agentCount * 6);
        const newColors = new Float32Array(agentCount * 3);

        for(let i=0; i<agentCount; i++) {
            const t = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
            const x = t.x + getRandomRange(-0.4, 0.4);
            const y = t.y + getRandomRange(-0.4, 0.4);

            agentsState.current[i*6+0] = x;
            agentsState.current[i*6+1] = y;
            
            const tt = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
            agentsState.current[i*6+2] = tt.x + getRandomRange(-0.4, 0.4);
            agentsState.current[i*6+3] = tt.y + getRandomRange(-0.4, 0.4);
            
            agentsState.current[i*6+4] = getRandomRange(0.005, 0.015);
            agentsState.current[i*6+5] = Math.random() * Math.PI * 2; 

            const c = new THREE.Color(clothesColors[Math.floor(Math.random() * clothesColors.length)]);
            newColors[i*3] = c.r; newColors[i*3+1] = c.g; newColors[i*3+2] = c.b;
        }

        if (meshRef.current) {
            meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(newColors, 3);
            meshRef.current.instanceColor.needsUpdate = true;
        }
    }, [agentCount, walkableTiles]);

    useFrame((state) => {
        if (!meshRef.current || agentCount === 0 || agentsState.current.length === 0) return;
        const time = state.clock.elapsedTime;

        for(let i=0; i<agentCount; i++) {
            const idx = i*6;
            let x = agentsState.current[idx];
            let y = agentsState.current[idx+1];
            let tx = agentsState.current[idx+2];
            let ty = agentsState.current[idx+3];
            const speed = agentsState.current[idx+4];
            const animOffset = agentsState.current[idx+5];

            const dx = tx - x;
            const dy = ty - y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < 0.1) {
                if (walkableTiles.length > 0) {
                    const tt = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
                    tx = tt.x + getRandomRange(-0.4, 0.4);
                    ty = tt.y + getRandomRange(-0.4, 0.4);
                    agentsState.current[idx+2] = tx;
                    agentsState.current[idx+3] = ty;
                }
            } else {
                x += (dx/dist) * speed;
                y += (dy/dist) * speed;
                agentsState.current[idx] = x;
                agentsState.current[idx+1] = y;
            }

            const [wx, _, wz] = gridToWorld(x, y);
            const bounce = Math.abs(Math.sin(time * 10 + animOffset)) * 0.03;
            const height = 0.2;
            const width = 0.08;
            const groundY = -0.35; 

            dummy.position.set(wx, groundY + height/2 + bounce, wz);
            dummy.rotation.set(0, -Math.atan2(dy, dx), 0);
            dummy.scale.set(width, height, width);
            
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    if (agentCount === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[boxGeo, undefined, agentCount]} castShadow>
            <meshStandardMaterial roughness={0.8} />
        </instancedMesh>
    )
};

const Cloud = ({ position, scale, speed }: { position: [number, number, number], scale: number, speed: number }) => {
    const group = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (group.current) {
            group.current.position.x += speed * delta;
            if (group.current.position.x > GRID_SIZE * 1.5) group.current.position.x = -GRID_SIZE * 1.5;
        }
    });

    const bubbles = useMemo(() => Array.from({length: 5 + Math.random() * 5}).map(() => ({
        pos: [getRandomRange(-1,1), getRandomRange(-0.5, 0.5), getRandomRange(-1,1)] as [number, number, number],
        scale: getRandomRange(0.5, 1.2)
    })), []);

    return (
        <group ref={group} position={position} scale={scale}>
            {bubbles.map((b, i) => (
                <mesh key={i} geometry={sphereGeo} position={b.pos} scale={b.scale} castShadow>
                    <meshStandardMaterial color="white" flatShading opacity={0.9} transparent />
                </mesh>
            ))}
        </group>
    )
}

const Bird = ({ position, speed, offset }: { position: [number, number, number], speed: number, offset: number }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if(ref.current) {
            const time = state.clock.elapsedTime + offset;
            ref.current.position.x = position[0] + Math.sin(time * speed) * GRID_SIZE;
            ref.current.position.z = position[1] + Math.cos(time * speed) * GRID_SIZE/2;
            ref.current.rotation.y = -time * speed + Math.PI;
            ref.current.scale.y = 1 + Math.sin(time * 15) * 0.3;
        }
    });

    return (
        <group ref={ref} position={[position[0], position[2], position[1]]}>
            <mesh geometry={boxGeo} scale={[0.2, 0.05, 0.05]} position={[0.1,0,0]} rotation={[0, Math.PI/4, 0]}><meshBasicMaterial color="#333" /></mesh>
            <mesh geometry={boxGeo} scale={[0.2, 0.05, 0.05]} position={[-0.1,0,0]} rotation={[0, -Math.PI/4, 0]}><meshBasicMaterial color="#333" /></mesh>
        </group>
    )
}

const DayNightCycle = () => {
    const lightRef = useRef<THREE.DirectionalLight>(null);
    
    useFrame((state) => {
        const time = state.clock.elapsedTime;
        const angle = (time % 60) / 60 * Math.PI * 2; 
        
        const radius = 100;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = 20; 

        if (lightRef.current) {
            // Update light position directly via ref to avoid React render loop
            lightRef.current.position.set(x, y, z);
            lightRef.current.intensity = y > 0 ? 2 : 0;
        }
    });

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight
                ref={lightRef}
                castShadow
                position={[100, 20, 100]} // Initial pos
                intensity={2}
                color="#fffbeb"
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-20} shadow-camera-right={20}
                shadow-camera-top={20} shadow-camera-bottom={-20}
            />
        </>
    );
};

const EnvironmentEffects = () => {
    return (
        <group raycast={() => null}>
             {/* Clouds */}
            <Cloud position={[-12, 8, 4]} scale={1.5} speed={0.3} />
            <Cloud position={[5, 9, -8]} scale={1.2} speed={0.5} />
            <Cloud position={[15, 7, 10]} scale={1.8} speed={0.2} />
            
            {/* Birds */}
            <group position={[0, 0, 0]} scale={0.8}>
                <Bird position={[0, 0, 10]} speed={0.6} offset={0} />
                <Bird position={[0, 0, 10]} speed={0.6} offset={1.2} />
                <Bird position={[0, 0, 10]} speed={0.6} offset={2.5} />
            </group>

            {/* Water */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
                <planeGeometry args={[GRID_SIZE * 4, GRID_SIZE * 4]} />
                <meshStandardMaterial color="#3b82f6" roughness={0.1} metalness={0.5} opacity={0.8} transparent />
            </mesh>
            
            <DayNightCycle />
        </group>
    )
};


// --- 3. Main Map Component ---

const RoadMarkings = React.memo(({ x, y, grid, yOffset }: { x: number; y: number; grid: Grid; yOffset: number }) => {
  const lineMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fbbf24' }), []);
  const lineGeo = useMemo(() => new THREE.PlaneGeometry(0.1, 0.5), []);

  const hasUp = y > 0 && grid[y - 1][x].buildingType === BuildingType.Road;
  const hasDown = y < GRID_SIZE - 1 && grid[y + 1][x].buildingType === BuildingType.Road;
  const hasLeft = x > 0 && grid[y][x - 1].buildingType === BuildingType.Road;
  const hasRight = x < GRID_SIZE - 1 && grid[y][x + 1].buildingType === BuildingType.Road;

  const connections = [hasUp, hasDown, hasLeft, hasRight].filter(Boolean).length;
  
  if (connections === 0) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yOffset, 0]} geometry={lineGeo} material={lineMaterial} />
    );
  }

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, yOffset, 0]}>
      {(hasUp || hasDown) && (hasLeft || hasRight) && (
        <mesh position={[0, 0, 0.005]} material={lineMaterial}>
           <planeGeometry args={[0.12, 0.12]} />
        </mesh>
      )}

      {hasUp && <mesh position={[0, 0.25, 0]} geometry={lineGeo} material={lineMaterial} />}
      {hasDown && <mesh position={[0, -0.25, 0]} geometry={lineGeo} material={lineMaterial} />}
      {hasLeft && <mesh position={[-0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]} geometry={lineGeo} material={lineMaterial} />}
      {hasRight && <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]} geometry={lineGeo} material={lineMaterial} />}
    </group>
  );
});

interface GroundTileProps {
    type: BuildingType;
    x: number;
    y: number;
    grid: Grid;
    onHover: (x: number, y: number) => void;
    onLeave: () => void;
    onClick: (x: number, y: number) => void;
}

const GroundTile = React.memo(({ type, x, y, grid, onHover, onLeave, onClick }: GroundTileProps) => {
  const [wx, _, wz] = gridToWorld(x, y);
  
  let color = '#10b981';
  let topY = -0.3; 
  let thickness = 0.5;
  
  if (type === BuildingType.None) {
    const noise = getHash(x, y);
    color = noise > 0.7 ? '#059669' : noise > 0.3 ? '#10b981' : '#34d399';
    topY = -0.3 - noise * 0.1; 
  } else if (type === BuildingType.Road) {
    color = '#374151';
    topY = -0.29; 
  } else {
    color = '#d1d5db'; 
    topY = -0.28;
  }

  const centerY = topY - thickness/2;

  return (
    <mesh 
        position={[wx, centerY, wz]} 
        receiveShadow castShadow
        onPointerEnter={(e) => { e.stopPropagation(); onHover(x, y); }}
        onPointerOut={(e) => { e.stopPropagation(); onLeave(); }}
        onPointerDown={(e) => {
            e.stopPropagation();
            if (e.button === 0) onClick(x, y);
        }}
    >
      <boxGeometry args={[1, thickness, 1]} />
      <meshStandardMaterial color={color} flatShading roughness={1} />
      {type === BuildingType.Road && <RoadMarkings x={x} y={y} grid={grid} yOffset={thickness / 2 + 0.001} />}
    </mesh>
  );
});

const Cursor = ({ x, y, color }: { x: number, y: number, color: string }) => {
  const [wx, _, wz] = gridToWorld(x, y);
  return (
    <mesh position={[wx, -0.25, wz]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} depthTest={false} />
      <Outlines thickness={0.05} color="white" />
    </mesh>
  );
};

// --- Camera & Controls Logic ---

const CameraRig = ({ 
    controlsRef, 
    shouldReset, 
    setShouldReset, 
    zoomDelta, 
    setZoomDelta,
    rotationAngle 
}: { 
    controlsRef: React.MutableRefObject<any>, 
    shouldReset: boolean, 
    setShouldReset: (v: boolean) => void,
    zoomDelta: number,
    setZoomDelta: (v: number) => void,
    rotationAngle: number
}) => {
  const { camera, invalidate } = useThree();
  const targetZoom = useRef(45);
  
  useEffect(() => {
     const controls = controlsRef.current;
     if(!controls) return;
     const callback = () => {
         targetZoom.current = camera.zoom;
     };
     controls.addEventListener('change', callback);
     return () => controls.removeEventListener('change', callback);
  }, [controlsRef, camera]);

  useEffect(() => {
    if (zoomDelta !== 0) {
        targetZoom.current = MathUtils.clamp(targetZoom.current + zoomDelta * 10, 20, 120);
        setZoomDelta(0);
        invalidate();
    }
  }, [zoomDelta, setZoomDelta, invalidate]);

  useFrame((state, delta) => {
    // Determine target position based on rotationAngle
    const radius = 28.28; // approx sqrt(20^2 + 20^2)
    const targetX = Math.sin(rotationAngle + Math.PI/4) * radius;
    const targetZ = Math.cos(rotationAngle + Math.PI/4) * radius;
    const targetPos = new THREE.Vector3(targetX, 20, targetZ);

    if (shouldReset) {
        // Reset logic can go here if needed, simplified for rotation support
    }

    // Smoothly interpolate camera position to target rotation
    state.camera.position.lerp(targetPos, 2 * delta);
    
    // Safety check for controls
    if(controlsRef && controlsRef.current) {
        controlsRef.current.update();
    }
    
    // Smooth Zoom
    if (Math.abs(state.camera.zoom - targetZoom.current) > 0.1) {
        state.camera.zoom = MathUtils.lerp(state.camera.zoom, targetZoom.current, 5 * delta);
        state.camera.updateProjectionMatrix();
    }
  });

  return null;
}

const ZoomInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
);
const ZoomOutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
);
const RotateLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
);
const RotateRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transform: 'scaleX(-1)'}}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
);

interface IsoMapProps {
  grid: Grid;
  onTileClick: (x: number, y: number) => void;
  hoveredTool: BuildingType;
  population: number;
}

const IsoMap: React.FC<IsoMapProps> = ({ grid, onTileClick, hoveredTool, population }) => {
  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null);
  const controlsRef = useRef<any>(null);
  const [shouldReset, setShouldReset] = useState(false);
  const [zoomDelta, setZoomDelta] = useState(0);
  const [rotationAngle, setRotationAngle] = useState(0);

  const handleHover = useCallback((x: number, y: number) => {
    setHoveredTile({ x, y });
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredTile(null);
  }, []);

  const rotate = (dir: number) => {
      setRotationAngle(prev => prev + dir * (Math.PI / 2));
  };

  const showPreview = hoveredTile && grid[hoveredTile.y][hoveredTile.x].buildingType === BuildingType.None && hoveredTool !== BuildingType.None;
  const previewColor = showPreview ? BUILDINGS[hoveredTool].color : 'white';
  const isBulldoze = hoveredTool === BuildingType.None;
  const previewPos = hoveredTile ? gridToWorld(hoveredTile.x, hoveredTile.y) : [0,0,0];

  return (
    <div className="absolute inset-0 touch-none">
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }}>
        <OrthographicCamera makeDefault zoom={45} position={[20, 20, 20]} near={-100} far={500} />
        
        <CameraRig 
            controlsRef={controlsRef} 
            shouldReset={shouldReset} 
            setShouldReset={setShouldReset}
            zoomDelta={zoomDelta}
            setZoomDelta={setZoomDelta}
            rotationAngle={rotationAngle}
        />

        <MapControls 
          ref={controlsRef}
          enableRotate={true}
          enableZoom={true}
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.5}
          minZoom={20}
          maxZoom={120}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={0.1}
          target={[0,-0.5,0]}
        />

        <Environment preset="city" />
        <EnvironmentEffects />

        <group>
          {grid.map((row, y) =>
            row.map((tile, x) => {
              const [wx, _, wz] = gridToWorld(x, y);
              return (
              <React.Fragment key={`${x}-${y}`}>
                <GroundTile 
                    type={tile.buildingType} 
                    x={x} y={y} 
                    grid={grid}
                    onHover={handleHover}
                    onLeave={handleLeave}
                    onClick={onTileClick}
                />
                <group position={[wx, 0, wz]} raycast={() => null}>
                    {tile.buildingType !== BuildingType.None && tile.buildingType !== BuildingType.Road && (
                      <ProceduralBuilding 
                        type={tile.buildingType} 
                        baseColor={BUILDINGS[tile.buildingType].color} 
                        x={x} y={y} 
                        level={tile.level}
                      />
                    )}
                </group>
              </React.Fragment>
            )})
          )}

          <group raycast={() => null}>
            <TrafficSystem grid={grid} />
            <PopulationSystem population={population} grid={grid} />

            {showPreview && hoveredTile && (
              <group position={[previewPos[0], 0, previewPos[2]]}>
                <Float speed={3} rotationIntensity={0} floatIntensity={0.1} floatingRange={[0, 0.1]}>
                  <ProceduralBuilding 
                    type={hoveredTool} 
                    baseColor={previewColor} 
                    x={hoveredTile.x} 
                    y={hoveredTile.y} 
                    transparent 
                    opacity={0.7} 
                  />
                </Float>
              </group>
            )}

            {hoveredTile && (
              <Cursor 
                x={hoveredTile.x} 
                y={hoveredTile.y} 
                color={isBulldoze ? '#ef4444' : (showPreview ? '#ffffff' : '#000000')} 
              />
            )}
          </group>
        </group>
      </Canvas>
      
      <div className="absolute bottom-28 right-4 flex flex-col gap-2 z-20 pointer-events-auto">
        <button 
            onClick={() => setZoomDelta(1)} 
            className="w-10 h-10 bg-slate-800/90 text-white rounded-full flex items-center justify-center shadow-lg border border-slate-600 hover:bg-cyan-600 hover:border-cyan-400 active:scale-90 transition-all backdrop-blur-sm"
            title="Zoom In"
        >
            <ZoomInIcon />
        </button>
        <button 
            onClick={() => setZoomDelta(-1)} 
            className="w-10 h-10 bg-slate-800/90 text-white rounded-full flex items-center justify-center shadow-lg border border-slate-600 hover:bg-cyan-600 hover:border-cyan-400 active:scale-90 transition-all backdrop-blur-sm"
            title="Zoom Out"
        >
            <ZoomOutIcon />
        </button>
        <div className="h-px bg-slate-600/50 w-full my-0.5"></div>
        <button 
            onClick={() => rotate(1)} 
            className="w-10 h-10 bg-slate-800/90 text-white rounded-full flex items-center justify-center shadow-lg border border-slate-600 hover:bg-cyan-600 hover:border-cyan-400 active:scale-90 transition-all backdrop-blur-sm"
            title="Rotate Left"
        >
            <RotateLeftIcon />
        </button>
        <button 
            onClick={() => rotate(-1)} 
            className="w-10 h-10 bg-slate-800/90 text-white rounded-full flex items-center justify-center shadow-lg border border-slate-600 hover:bg-cyan-600 hover:border-cyan-400 active:scale-90 transition-all backdrop-blur-sm"
            title="Rotate Right"
        >
            <RotateRightIcon />
        </button>
      </div>
    </div>
  );
};

export default IsoMap;