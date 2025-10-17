'use client'

import React from "react"

type FAQItem = { question: string; answer: string }

interface FAQAccordionProps {
  items: FAQItem[]
  className?: string
}

export default function FAQAccordion({ items, className }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)

  return (
    <section className={className}>
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold text-white">자주 묻는 질문</h2>
        <div className="mt-8 divide-y divide-white/10 rounded-2xl ring-1 ring-white/10 bg-neutral-900/50 backdrop-blur">
          {items.map((item, idx) => {
            const isOpen = openIndex === idx
            return (
              <div key={item.question}>
                 <button
                  className="flex w-full items-center justify-between px-6 py-5 text-left text-white hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                >
                  <span className="text-lg font-medium">{item.question}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-5 w-5 text-white/70 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                 {isOpen && (
                  <div className="px-6 pt-3 pb-3 text-sm text-neutral-300">
                    {item.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}


