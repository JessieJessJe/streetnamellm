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
    const [suggestedQueries, setSuggestedQueries] = useState<string[]>([]);
    const [isAccordionOpen, setIsAccordionOpen] = useState(window?.innerWidth >= 1024);

    const allPopularQueries = [
        "Streets honor musicians?",
        "How about restaurants and local businesses?",
        "Any streets in Greenpoint?",
        "Where is the Museum Mile?",
        "Tell me a love story"
    ];

    // Function to get 3 random queries
    const getRandomQueries = () => {
        const shuffled = [...allPopularQueries].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3);
    };

    useEffect(() => {
        setSuggestedQueries(getRandomQueries());
    }, []);

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
            setSuggestedQueries(getRandomQueries()); // Refresh suggested queries
        }
    };

    const handleClear = () => {
        setQuery('');
        setAnswer('');
        onReset();
        setSuggestedQueries(getRandomQueries());
    };

    return (
        <div className="space-y-4 px-4 max-w-full">
            {/* Search Bar - Mobile Max Height */}
            <form onSubmit={handleSubmit} className="w-full max-h-[40vh] sm:max-h-[50vh]">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.currentTarget.value)}
                        placeholder="What would you like to know?"
                        className="w-full p-4 rounded-lg focus:ring-2 focus:ring-primary 
                          dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400
                          transition-all duration-200 ease-in-out"
                    />
                    <button
                        type="submit"
                        disabled={!query.trim() || isLoading}
                        className="px-6 py-4 bg-black text-white rounded-lg hover:bg-secondary
                          disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </form>

            {/* Suggested Queries */}
            <div className="flex gap-2 flex-wrap items-start text-left mt-4">
                {suggestedQueries.map((suggestion) => (
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
                    <div className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow dark:shadow-gray-900">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2"
                                onClick={() => setIsAccordionOpen(!isAccordionOpen)}>
                                <button

                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`h-5 w-5 transform transition-transform ${isAccordionOpen ? 'rotate-180' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <h3 className="text-md text-gray-700 dark:text-gray-100">Analysis from Language Model</h3>

                            </div>

                            <button
                                type="button"
                                onClick={handleClear}
                                className="px-3 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 
                                    rounded-lg flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                <span className="hidden lg:inline">Clear</span>
                            </button>
                        </div>

                        {/* Collapsible Content */}
                        <div
                            className={`transition-all duration-300 ease-in-out overflow-hidden`}
                            style={{
                                maxHeight: isAccordionOpen ? '50vh' : '0',
                                opacity: isAccordionOpen ? 1 : 0
                            }}
                        >
                            {/* Scrollable Answer Box */}
                            <div className="text-left space-y-2 overflow-y-auto max-h-[40vh] border-t pt-2">
                                <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-300">{answer}</p>
                            </div>

                            {/* Updated Footnote */}
                            <p className="text-sm text-gray-600 dark:text-gray-400 border-t pt-2 mt-4">
                                Showing {currentData.length.toLocaleString()} of {originalData.length.toLocaleString()} matching streets.
                                Darker markers indicate stronger relevance to your question.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
