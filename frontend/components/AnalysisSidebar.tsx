'use client'

import { useState } from 'react'
import { Clause } from '@/lib/api'
import { AdvancedAnalysis } from '@/lib/api'
import ReportGenerator from './ReportGenerator'

interface AnalysisSidebarProps {
  clauses: Clause[]
  onClauseClick: (clauseId: string) => void
  documentSummary?: string
  fullAnalysis?: string
  advancedAnalysis?: AdvancedAnalysis
}

export default function AnalysisSidebar({ clauses, onClauseClick, documentSummary, fullAnalysis, advancedAnalysis }: AnalysisSidebarProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  // Fixed TypeScript error - only using summary, clauses, categories tabs
  const [activeTab, setActiveTab] = useState<'summary' | 'clauses' | 'categories'>('summary')
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null)

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

  const getClauseCategory = (clause: Clause) => {
    const text = clause.text.toLowerCase()
    if (text.includes('payment') || text.includes('fee') || text.includes('cost')) return '💰 Payment Terms'
    if (text.includes('termination') || text.includes('breach') || text.includes('default')) return '❌ Termination & Breach'
    if (text.includes('notice') || text.includes('day') || text.includes('month')) return '📆 Time/Notice Periods'
    if (text.includes('obligation') || text.includes('liable') || text.includes('responsible')) return '⚖️ Legal Obligations'
    if (text.includes('confidential') || text.includes('proprietary')) return '🔒 Confidentiality'
    if (text.includes('intellectual property') || text.includes('copyright')) return '📝 IP Rights'
    return '📋 General Terms'
  }

  const getCategorizedClauses = () => {
    const categorized: Record<string, Clause[]> = {}
    clauses.forEach(clause => {
      const category = getClauseCategory(clause)
      if (!categorized[category]) categorized[category] = []
      categorized[category].push(clause)
    })
    return categorized
  }

  const handleClauseClick = (clause: Clause) => {
    setSelectedClause(clause)
    onClauseClick(clause.id)
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Legal Analysis</h2>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-4">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-2 py-2 text-xs rounded-md transition-colors ${activeTab === 'summary'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('clauses')}
            className={`px-2 py-2 text-xs rounded-md transition-colors ${activeTab === 'clauses'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Clauses ({clauses.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-2 py-2 text-xs rounded-md transition-colors ${activeTab === 'categories'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Categories
          </button>
        </div>

        {/* Stats - Only show for clauses tab */}
        {activeTab === 'clauses' && (
          <>
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
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedCategory === category
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
          </>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'summary' ? (
          /* Document Summary */
          <div className="space-y-4">
            {documentSummary || fullAnalysis ? (
              <div className="prose prose-sm max-w-none">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    AI-Powered Document Summary
                  </h3>
                  <div className="text-sm text-blue-800 whitespace-pre-wrap">
                    {fullAnalysis || documentSummary}
                  </div>
                </div>

                {/* Advanced Analysis Stats */}
                {advancedAnalysis?.summary && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-semibold text-green-900 mb-2">Advanced Analysis</h3>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-red-100 rounded">
                        <div className="font-bold text-red-700">{advancedAnalysis.summary.high_risk_clauses}</div>
                        <div className="text-red-600">High Risk</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-100 rounded">
                        <div className="font-bold text-yellow-700">{advancedAnalysis.summary.medium_risk_clauses}</div>
                        <div className="text-yellow-600">Medium Risk</div>
                      </div>
                      <div className="text-center p-2 bg-green-100 rounded">
                        <div className="font-bold text-green-700">{advancedAnalysis.summary.low_risk_clauses}</div>
                        <div className="text-green-600">Low Risk</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-gray-900">{stats.Total}</div>
                    <div className="text-xs text-gray-600">Total Clauses</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded">
                    <div className="text-lg font-bold text-red-600">{stats.Red}</div>
                    <div className="text-xs text-red-600">High Risk</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Document summary will appear here once analysis is complete.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'categories' ? (
          /* Categories View */
          <div className="space-y-4">
            {advancedAnalysis?.summary ? (
              <div className="space-y-4">
                {/* Parties */}
                {advancedAnalysis.summary.all_parties.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      Parties ({advancedAnalysis.summary.unique_parties})
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {advancedAnalysis.summary.all_parties.map((party, idx) => (
                        <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                          {party}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dates */}
                {advancedAnalysis.summary.all_dates.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      Dates ({advancedAnalysis.summary.unique_dates})
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {advancedAnalysis.summary.all_dates.map((date, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {date}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Money Amounts */}
                {advancedAnalysis.summary.all_money.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-green-900 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                      </svg>
                      Money Amounts ({advancedAnalysis.summary.unique_money_amounts})
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {advancedAnalysis.summary.all_money.map((amount, idx) => (
                        <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          {amount}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analysis Features Status */}
                {advancedAnalysis.analysis_features && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Analysis Features</h3>
                    <div className="space-y-1 text-xs">
                      {Object.entries(advancedAnalysis.analysis_features).map(([feature, enabled]) => (
                        <div key={feature} className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className={enabled ? 'text-green-700' : 'text-red-700'}>
                            {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Document summary will appear here once analysis is complete.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'clauses' ? (
          /* Enhanced Clauses List with Tooltips */
          <div className="space-y-3">
            {filteredClauses.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No clauses found for the selected category.</p>
              </div>
            ) : (
              filteredClauses.map(clause => (
                <div
                  key={clause.id}
                  onClick={() => handleClauseClick(clause)}
                  className={`clause-item p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${clause.category === 'Red'
                    ? 'border-red-200 bg-red-50 hover:border-red-300'
                    : clause.category === 'Yellow'
                      ? 'border-yellow-200 bg-yellow-50 hover:border-yellow-300'
                      : 'border-green-200 bg-green-50 hover:border-green-300'
                    } ${selectedClause?.id === clause.id ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`p-1 rounded ${getCategoryColor(clause.category)}`}>
                        {getRiskIcon(clause.category)}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-gray-900 block">
                          {getClauseCategory(clause)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {clause.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className="text-xs text-gray-500">
                        Page {clause.page_number}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${clause.category === 'Red'
                        ? 'bg-red-100 text-red-800'
                        : clause.category === 'Yellow'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                        }`}>
                        {(clause.score * 100).toFixed(0)}% Risk
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                    {clause.text}
                  </p>

                  {/* Plain English Explanation */}
                  {clause.explanation && (
                    <div className={`text-xs p-3 rounded-md border-l-4 ${clause.category === 'Red'
                      ? 'bg-red-50 border-red-400 text-red-700'
                      : clause.category === 'Yellow'
                        ? 'bg-yellow-50 border-yellow-400 text-yellow-700'
                        : 'bg-green-50 border-green-400 text-green-700'
                      }`}>
                      <div className="font-medium mb-1">Plain English:</div>
                      {clause.explanation}
                    </div>
                  )}

                  {/* Click to highlight indicator */}
                  <div className="text-xs text-gray-400 mt-2 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Click to highlight in PDF
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Smart Clause Categories */
          <div className="space-y-4">
            {Object.entries(getCategorizedClauses()).map(([category, categoryClause]) => (
              <div key={category} className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="text-lg mr-2">{category.split(' ')[0]}</span>
                  {category.substring(2)} ({categoryClause.length})
                </h3>
                <div className="space-y-2">
                  {categoryClause.map(clause => (
                    <div
                      key={clause.id}
                      onClick={() => handleClauseClick(clause)}
                      className={`p-2 rounded cursor-pointer transition-colors ${clause.category === 'Red'
                        ? 'bg-red-100 hover:bg-red-200 border-l-4 border-red-400'
                        : clause.category === 'Yellow'
                          ? 'bg-yellow-100 hover:bg-yellow-200 border-l-4 border-yellow-400'
                          : 'bg-green-100 hover:bg-green-200 border-l-4 border-green-400'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {clause.type}
                        </span>
                        <div className="flex items-center space-x-2">
                          {getRiskIcon(clause.category)}
                          <span className="text-xs text-gray-500">
                            Page {clause.page_number}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {clause.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Generator - Always visible at bottom */}
      {clauses.length > 0 && (
        <ReportGenerator
          clauses={clauses}
          documentSummary={documentSummary}
          fullAnalysis={fullAnalysis}
          documentId={clauses[0]?.id || 'unknown'}
        />
      )}
    </div>
  )
}