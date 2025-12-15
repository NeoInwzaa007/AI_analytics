'use client';

import React, { useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

function AICore() {
    const meshRef = useRef<THREE.Mesh>(null);
    // Load texture
    const texture = useLoader(THREE.TextureLoader, '/textures/ai-core.png');

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += delta * 0.2;
            meshRef.current.rotation.y += delta * 0.3;
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
            <mesh ref={meshRef} scale={2}>
                <dodecahedronGeometry args={[1, 0]} />
                <meshStandardMaterial
                    map={texture}
                    emissiveMap={texture}
                    emissiveIntensity={2}
                    color="#4f46e5"
                    roughness={0.2}
                    metalness={0.8}
                />
            </mesh>
        </Float>
    );
}


interface LandingViewProps {
    onStart: () => void;
}

export default function LandingView({ onStart }: LandingViewProps) {
    return (
        <div className="relative w-full h-screen overflow-hidden">
            {/* 3D Scene */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} color="#6366f1" />
                    <pointLight position={[-10, -10, -10]} intensity={0.5} color="#a855f7" />

                    <AICore />

                    <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
                </Canvas>
            </div>

            {/* UI Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="text-center space-y-6 max-w-2xl px-4"
                >
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center shadow-lg shadow-white/10 border border-white/20">
                            <span className="font-bold text-2xl text-white">AI</span>
                        </div>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-white drop-shadow-sm">
                        AI Analytics
                    </h1>

                    <p className="text-lg md:text-xl text-slate-300 pointer-events-auto">
                        Unlock the power of your data with next-generation artificial intelligence.
                    </p>

                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="pointer-events-auto pt-4"
                    >
                        <Button
                            size="lg"
                            onClick={onStart}
                            className="bg-white text-indigo-950 hover:bg-slate-200 text-lg px-8 py-6 rounded-full font-semibold shadow-xl shadow-indigo-500/20 transition-all duration-300 group"
                        >
                            Get Started
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </motion.div>
                </motion.div>
            </div>

            {/* Footer / Credit */}
            <div className="absolute bottom-6 w-full text-center z-10 opacity-40 text-xs text-white">
                Powered by FocusOne
            </div>
        </div>
    );
}
