"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GitBranch, Mic, ArrowRight } from "lucide-react"

interface Choice {
  id: string
  choice_text: string
  choice_number: number
  voice_command: string
  next_audiobook_id: string | null
}

interface InteractiveChoicesProps {
  choices: Choice[]
  onChoiceSelected: (choice: Choice) => void
}

export function InteractiveChoices({ choices, onChoiceSelected }: InteractiveChoicesProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)

  const handleChoiceClick = (choice: Choice) => {
    setSelectedChoice(choice.id)
    setTimeout(() => {
      onChoiceSelected(choice)
    }, 500)
  }

  return (
    <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5 shadow-xl">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <GitBranch className="h-6 w-6 text-primary" />
          <CardTitle className="font-serif text-2xl">Choose Your Path</CardTitle>
        </div>
        <p className="text-muted-foreground">Select an option below or use voice commands to continue your story</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {choices.map((choice) => (
            <Card
              key={choice.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
                selectedChoice === choice.id ? "ring-2 ring-primary bg-primary/10" : "hover:bg-accent/20"
              }`}
              onClick={() => handleChoiceClick(choice)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="font-mono">
                        {choice.choice_number}
                      </Badge>
                      <h3 className="font-serif font-semibold text-lg">{choice.choice_text}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mic className="h-3 w-3" />
                      <span>Say: "{choice.voice_command}"</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {choice.next_audiobook_id ? (
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Badge variant="secondary">End</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-3">
            <Mic className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">Voice Control Instructions</h4>
              <p className="text-sm text-muted-foreground">
                You can click on any option above, or simply speak your choice out loud. Say the number (e.g., "one",
                "two") or the specific voice command shown for each option.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
