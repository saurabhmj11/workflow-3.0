'use client'

import { useState, useEffect } from 'react'
import { Rocket, Star, ArrowRight, X, Heart, Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TUTORIAL_STEPS = [
  {
    title: "Welcome to Bot Builder! 🤖",
    text: "Here you can build your very own robot friend by snapping blocks together!",
    icon: <Smile className="w-16 h-16 text-blue-500 " />,
    color: "bg-blue-100 border-blue-400"
  },
  {
    title: "Step 1: Pick a Block! 🧱",
    text: "Look at the left side of the screen. See all those fun blocks? Grab one and drag it to the big empty space!",
    icon: <Rocket className="w-16 h-16 text-pink-500 animate-pulse" />,
    color: "bg-pink-100 border-pink-400"
  },
  {
    title: "Step 2: Connect them! 🔗",
    text: "You can connect blocks by drawing a line between them. Make them talk to each other!",
    icon: <Star className="w-16 h-16 text-yellow-500 animate-spin-slow" />,
    color: "bg-yellow-100 border-yellow-400"
  },
  {
    title: "Step 3: Make it Go! 🏃",
    text: "Click the big green PLAY button at the top to watch your robot do its magic! Have fun!",
    icon: <Heart className="w-16 h-16 text-red-500 animate-pulse" />,
    color: "bg-red-100 border-red-400"
  }
]

export function TutorialLayer() {
  const [step, setStep] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check if it's the first time
    const hasSeenTutorial = localStorage.getItem('hasSeenBotTutorial')
    if (!hasSeenTutorial) {
      setIsOpen(true)
    }
  }, [])

  const nextStep = () => {
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep(step + 1)
    } else {
      closeTutorial()
    }
  }

  const closeTutorial = () => {
    setIsOpen(false)
    localStorage.setItem('hasSeenBotTutorial', 'true')
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-16 w-16 bg-yellow-400 rounded-full border border-yellow-500 shadow-xl flex items-center justify-center hover:scale-110 transition-transform z-50 "
      >
        <Star className="text-white w-8 h-8" />
      </button>
    )
  }

  const currentStep = TUTORIAL_STEPS[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`relative w-full max-w-lg p-8 rounded-[3rem] border-8 shadow-2xl transition-all duration-500 transform scale-100 ${currentStep.color}`}>
        
        <button 
          onClick={closeTutorial}
          className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-slate-100"
        >
          <X className="w-6 h-6 text-slate-500" />
        </button>

        <div className="flex flex-col items-center text-center space-y-6">
          <div className="p-4 bg-white rounded-full shadow-lg">
            {currentStep.icon}
          </div>
          
          <h2 className="text-4xl font-semibold text-slate-800">
            {currentStep.title}
          </h2>
          
          <p className="text-2xl text-slate-700 font-medium leading-tight">
            {currentStep.text}
          </p>

          <div className="flex items-center justify-between w-full pt-6">
            <div className="flex gap-2">
              {TUTORIAL_STEPS.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-4 w-4 rounded-full transition-colors ${i === step ? 'bg-slate-800' : 'bg-slate-300'}`} 
                />
              ))}
            </div>
            
            <Button 
              size="lg" 
              onClick={nextStep}
              className="bg-green-500 hover:bg-green-600 text-white border border-green-600 text-2xl font-semibold px-8 py-6 rounded-full shadow-sm active:scale-[0.98] active:shadow-[0_0px_0_rgb(22,163,74)]"
            >
              {step === TUTORIAL_STEPS.length - 1 ? "LET'S GO!" : "NEXT"}
              {step < TUTORIAL_STEPS.length - 1 && <ArrowRight className="w-8 h-8 ml-2" />}
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
