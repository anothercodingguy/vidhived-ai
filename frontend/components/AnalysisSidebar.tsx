'use client'

import { useState } from 'react'
import { Clause } from '@/lib/api'

interface AnalysisSidebarProps {
  clauses: Clause[]
  onClauseClick: (clauseId: string) => void
}

export default function AnalysisSidebar({ clauses, onClauseClick }: AnalysisSidebarProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  const categories = ['All', 'Red', 'Yellow', 'Green']
  
  const filteredClauses = selectedCategory === 'All' 
    ? clauses 
    : clauses.filter(clause => clause.category === selectedCategory)

  const getCategoryStats = () => {
    const stats = clauses.reduce((acc, clause) => {
      acc[clause.category] = (acc[clause.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      Red: stats.Red || 0,
      Yellow: stats.Yellow || 0,
      Green: stats.Green || 0,
      Total: clauses.length
    }
  }

  const stats = getCategoryStats()

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Red': return 'text-red-600 bg-red-50 border-red-200'
      case 'Yellow': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'Green': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getRiskIcon = (category: string) => {
    switch (category) {
      case 'Red':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'Yellow':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'Green':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Legal Analysis</h2>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="text-center p-2 bg-red-50 rounded">
            <div className="text-lg font-bold text-red-600">{stats.Red}</div>
            <div className="text-xs text-red-600">High Risk</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded">
            <div className="text-lg font-bold text-yellow-600">{stats.Yellow}</div>
            <div className="text-xs text-yellow-600">Medium Risk</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-lg font-bold text-green-600">{stats.Green}</div>
            <div className="text-xs text-green-600">Low Risk</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-bold text-gray-600">{stats.Total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {category}
              {category !== 'All' && (
                <span className="ml-1">({stats[category as keyof typeof stats] || 0})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Clauses List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredClauses.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No clauses found for the selected category.</p>
          </div>
        ) : (
          filteredClauses.map(clause => (
            <div
              key={clause.id}
              onClick={() => onClauseClick(clause.id)}
              className={`clause-item ${clause.category.toLowerCase()} cursor-pointer`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={getCategoryColor(clause.category)}>
                    {getRiskIcon(clause.category)}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {clause.type}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    Page {clause.page_number}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(clause.category)}`}>
                    {(clause.score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-700 mb-2 line-clamp-3">
                {clause.text}
              </p>
              
              {clause.explanation && (
                <div className={`text-xs p-2 rounded border-l-4 ${
                  clause.category === 'Red' 
                    ? 'bg-red-50 border-red-400 text-red-700'
                    : 'bg-yellow-50 border-yellow-400 text-yellow-700'
                }`}>
                  {clause.explanation}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}