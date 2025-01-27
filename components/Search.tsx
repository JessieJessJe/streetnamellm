'use client';
import { useState } from 'react';
import { queryLLM } from '@/lib/llm';

interface SearchProps {
    originalData: any[];
    currentData: any[];
    onFilter: (filteredEntries: any[], query: string) => void;
    onReset: () => void;
}

export function Search({
    originalData,
    currentData,
    onFilter,
    onReset
}: SearchProps) {
    const [answer, setAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [showContextHelp, setShowContextHelp] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setAnswer('');

        try {
            const response = await queryLLM({
                entries: currentData,
                question: query,
            });

            setAnswer(response.answer);

            // Only update filters if we have valid results
            if (response.filteredEntries.length > 0 &&
                response.filteredEntries !== currentData) {
                onFilter(response.filteredEntries, query);
            } else if (response.filteredEntries.length === 0) {
                setAnswer(prev => `${prev}\n\nNo matching entries found.`);
            }
        } catch (error) {
            console.error('Search failed:', error);
            setAnswer('Sorry, we encountered an error processing your request.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap">
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        value={query}
                        onInput={(e) => setQuery(e.currentTarget.value)}
                        placeholder="Ask about honorees (e.g. 'Who are 9/11 heroes?')"
                        className="flex-1 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                      dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
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

            <div className="space-y-4">
                {answer && (
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg dark:text-gray-100">Analysis</h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                (Showing {currentData.length.toLocaleString()} of {originalData.length.toLocaleString()} total entries)
                            </span>
                        </div>

                        <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-300 mb-4">
                            {answer}
                        </p>

                        {currentData.length > 10 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Note: Analysis based on first 10 most relevant entries
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}