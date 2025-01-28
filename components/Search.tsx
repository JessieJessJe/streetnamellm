'use client';
import { useState } from 'react';
import { queryLLM } from '../lib/llm';
import { SearchProps } from '../types';

export function Search({
    originalData,
    currentData,
    onFilter,
}: SearchProps) {
    const [answer, setAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [query, setQuery] = useState('');

    // Modified handleSubmit to accept an optional query parameter
    const handleSubmit = async (e?: React.FormEvent, predefinedQuery?: string) => {
        if (e) e.preventDefault(); // Prevent form submission when triggered manually

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
            setAnswer('Sorry, we encountered an error processing your request.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4 px-4">
            <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap">
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        value={query}
                        onInput={(e) => setQuery(e.currentTarget.value)}
                        onClick={() => answer && setQuery('')}
                        placeholder="Ask a questions about NYC street names"
                        className="flex-1 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                          dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400
                          transition-all duration-200 ease-in-out"
                    />
                    <button
                        type="submit"
                        disabled={!query.trim() || isLoading}
                        className="px-6 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                          disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Analyzing...' : 'Search'}
                    </button>
                </div>
            </form>


            <div className="flex gap-2 flex-wrap justify-start mt-4">
                {[
                    'Famous musicians honored?',
                    'Streets honoring women?',
                    'Where is Walt Whitman Way?',
                ].map((suggestion) => (
                    <button
                        key={suggestion}
                        onClick={() => {
                            setQuery(suggestion); // Update input field
                            handleSubmit(undefined, suggestion); // Trigger search
                        }}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-300 rounded-lg 
                          hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {answer && (
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900">
                        <div className="flex flex-col space-y-4 text-left">
                            <div className="space-y-2">
                                <h3 className="font-bold text-lg dark:text-gray-100">Analysis</h3>
                                <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-300">
                                    {answer}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-bold text-lg dark:text-gray-100">Map</h3>
                                <span className="whitespace-pre-wrap text-gray-900 dark:text-gray-300">
                                    Showing {currentData.length.toLocaleString()} of {originalData.length.toLocaleString()} total entries
                                </span>

                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
