'use client';
import { useState, useEffect } from 'react';
import { queryLLM } from '../lib/llm';
import { SearchProps } from '../types';

export function Search({
    originalData,
    currentData,
    onFilter,
    onReset
}: SearchProps) {
    const [answer, setAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Suggested queries
    const popularQueries = [
        "Which NYC streets honor musicians?",
        "Which streets are named after women?",
        "Where is Walt Whitman Way?"
    ];

    useEffect(() => {
        if (query.trim()) {
            setShowSuggestions(true);
            const filtered = popularQueries.filter(q => q.toLowerCase().includes(query.toLowerCase()));
            setSuggestions(filtered.length ? filtered : ["No suggestions found"]);
        } else {
            setShowSuggestions(false);
        }
    }, [query]);

    const handleSubmit = async (e?: React.FormEvent, predefinedQuery?: string) => {
        if (e) e.preventDefault();
        const searchQuery = predefinedQuery || query.trim();
        if (!searchQuery) return;

        setIsLoading(true);
        setAnswer('');

        try {
            const response = await queryLLM({
                entries: originalData,
                question: searchQuery,
            });
            setAnswer(response.answer);
            onFilter(response.filteredEntries, searchQuery);
        } catch (error) {
            console.error('Search failed:', error);
            setAnswer('Oops! Something went wrong. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4 px-4 max-w-full">
            {/* Search Bar */}
            <form onSubmit={handleSubmit} className="relative w-full">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.currentTarget.value)}
                        onClick={() => answer && setQuery('')}
                        placeholder="Curious about NYC street names? Ask away!"
                        className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                          dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400
                          transition-all duration-200 ease-in-out"
                    />
                    <button
                        type="submit"
                        disabled={!query.trim() || isLoading}
                        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                          disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Searching...' : 'Search'}
                    </button>
                </div>

                {/* Auto-Suggest Dropdown */}
                {showSuggestions && (
                    <div className="absolute top-full mt-1 left-0 w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg z-10 max-h-40 overflow-auto">
                        {suggestions.map((suggestion, idx) => (
                            <div
                                key={idx}
                                className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-300"
                                onClick={() => {
                                    setQuery(suggestion);
                                    setShowSuggestions(false);
                                    handleSubmit(undefined, suggestion);
                                }}
                            >
                                {suggestion}
                            </div>
                        ))}
                    </div>
                )}
            </form>

            {/* Suggested Queries */}
            <div className="flex gap-2 flex-wrap justify-start mt-4">
                {popularQueries.map((suggestion) => (
                    <button
                        key={suggestion}
                        onClick={() => {
                            setQuery(suggestion);
                            handleSubmit(undefined, suggestion);
                        }}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-300 rounded-lg 
                          hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>

            {/* Answer Section */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 animate-pulse">
                        <div className="h-4 w-3/4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 w-1/2 bg-gray-300 dark:bg-gray-700 rounded mt-2"></div>
                        <div className="h-4 w-full bg-gray-300 dark:bg-gray-700 rounded mt-2"></div>
                    </div>
                ) : answer && (
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow dark:shadow-gray-900">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg dark:text-gray-100">Analysis from Language Model</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    onReset();
                                }}
                                className="px-3 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 
                                    rounded-lg flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Clear
                            </button>
                        </div>

                        <div className="text-left space-y-2">
                            <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-300">
                                {answer}
                            </p>

                            {/* Updated Footnote */}
                            <p className="text-sm text-gray-600 dark:text-gray-400 border-t pt-2 mt-2">
                                Showing {currentData.length.toLocaleString()} of {originalData.length.toLocaleString()} matching streets. Darker markers indicate stronger relevance to your question.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
