"use client"

import { useEffect, useState, useMemo } from "react"
import { cn } from "@/lib/utils"

interface WordData {
  palabra: string
  frecuencia: number
}

interface WordCloudProps {
  words: WordData[]
  className?: string
}

interface PositionedWord extends WordData {
  x: number
  y: number
  size: number
  color: string
  rotation: number
  delay: number
}

export function WordCloud({ words, className }: WordCloudProps) {
  const [hoveredWord, setHoveredWord] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const positionedWords = useMemo(() => {
    if (!words || words.length === 0) return []

    // Sort words by frequency
    const sortedWords = [...words].sort((a, b) => b.frecuencia - a.frecuencia)

    // Calculate size range
    const maxFreq = sortedWords[0]?.frecuencia || 1
    const minFreq = sortedWords[sortedWords.length - 1]?.frecuencia || 1

    // Color palette matching the design inspiration
    const colors = [
      "text-chart-1", // Blue
      "text-chart-2", // Cyan
      "text-chart-3", // Purple
      "text-foreground", // White
      "text-muted-foreground", // Gray
    ]

    // Position words in a spiral pattern for better distribution
    const positioned: PositionedWord[] = sortedWords.map((word, index) => {
      const normalizedFreq = (word.frecuencia - minFreq) / (maxFreq - minFreq || 1)

      // Size calculation: larger words for higher frequency
      const size = 14 + normalizedFreq * 48 // Range from 14px to 62px

      // Spiral positioning
      const angle = index * 0.5
      const radius = 5 + index * 2
      const x = 50 + radius * Math.cos(angle)
      const y = 50 + radius * Math.sin(angle)

      // Slight rotation for visual interest
      const rotation = (Math.random() - 0.5) * 10

      // Staggered animation delay
      const delay = index * 0.05

      return {
        ...word,
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(5, Math.min(95, y)),
        size,
        color: colors[index % colors.length],
        rotation,
        delay,
      }
    })

    return positioned
  }, [words])

  if (!mounted) {
    return (
      <div className={cn("w-full h-full min-h-[500px] flex items-center justify-center", className)}>
        <div className="text-muted-foreground">Cargando nube de palabras...</div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative w-full h-full min-h-[500px] overflow-hidden rounded-lg bg-card border border-border",
        className,
      )}
      role="img"
      aria-label="Nube de palabras interactiva"
    >
      {positionedWords.map((word, index) => {
        const isHovered = hoveredWord === word.palabra
        const isOtherHovered = hoveredWord !== null && !isHovered

        return (
          <button
            key={`${word.palabra}-${index}`}
            className={cn(
              "absolute font-sans font-semibold cursor-pointer select-none",
              "transition-all duration-300 ease-out",
              "hover:scale-110 hover:z-10",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
              "word-float-in",
              word.color,
              isHovered && "scale-125 z-20 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]",
              isOtherHovered && "opacity-40 scale-95",
            )}
            style={{
              left: `${word.x}%`,
              top: `${word.y}%`,
              fontSize: `${word.size}px`,
              transform: `translate(-50%, -50%) rotate(${word.rotation}deg)`,
              animationDelay: `${word.delay}s`,
              lineHeight: 1,
            }}
            onMouseEnter={() => setHoveredWord(word.palabra)}
            onMouseLeave={() => setHoveredWord(null)}
            onFocus={() => setHoveredWord(word.palabra)}
            onBlur={() => setHoveredWord(null)}
            aria-label={`${word.palabra}: ${word.frecuencia} menciones`}
          >
            {word.palabra}
          </button>
        )
      })}

      {/* Hover info panel */}
      {hoveredWord && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-popover border border-border rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <p className="text-sm text-popover-foreground font-mono">
            <span className="font-semibold">{hoveredWord}</span>
            <span className="text-muted-foreground mx-2">•</span>
            <span className="text-muted-foreground">
              {positionedWords.find((w) => w.palabra === hoveredWord)?.frecuencia} menciones
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
