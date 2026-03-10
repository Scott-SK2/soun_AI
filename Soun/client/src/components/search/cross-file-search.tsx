import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, FileText, BookOpen, Target } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  documentId: number;
  title: string;
  filename: string;
  courseId: string;
  relevantContent: string;
  relevanceScore: number;
  summary: string;
}

interface CrossFileSearchResult {
  query: string;
  totalDocuments: number;
  relevantDocuments: SearchResult[];
  synthesizedAnswer: string;
  sources: string[];
}

export function CrossFileSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CrossFileSearchResult | null>(null);
  const { toast } = useToast();

  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const response = await apiRequest('POST', '/api/search/documents', {
        query: searchQuery,
        maxResults: 8
      });
      return response.json();
    },
    onSuccess: (data: CrossFileSearchResult) => {
      setResults(data);
      if (data.relevantDocuments.length === 0) {
        toast({
          title: "No Results Found",
          description: "Try uploading more course materials or adjusting your search terms.",
        });
      }
    },
    onError: (error) => {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Unable to search documents. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSearch = () => {
    if (query.trim()) {
      searchMutation.mutate(query.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Cross-File Search
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Search across all your uploaded course materials to find relevant information
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Ask a question or search for specific topics..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch} 
              disabled={!query.trim() || searchMutation.isPending}
            >
              {searchMutation.isPending ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-4">
          {/* Search Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Search Results</h3>
                <Badge variant="secondary">
                  {results.relevantDocuments.length} of {results.totalDocuments} documents
                </Badge>
              </div>
              
              {results.synthesizedAnswer && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">AI Summary</h4>
                    <p className="text-blue-800 leading-relaxed">
                      {results.synthesizedAnswer}
                    </p>
                  </div>
                  
                  {results.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Sources:</span>
                      {results.sources.map((source, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Individual Documents */}
          {results.relevantDocuments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Relevant Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {results.relevantDocuments.map((doc, index) => (
                      <div key={doc.documentId}>
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium text-sm">{doc.title}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <BookOpen className="h-3 w-3" />
                                <span>{doc.courseId}</span>
                                <Target className="h-3 w-3 ml-2" />
                                <span>Relevance: {Math.round(doc.relevanceScore * 100)}%</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {doc.relevantContent}
                            </p>
                          </div>
                          
                          {doc.summary && (
                            <p className="text-xs text-muted-foreground italic">
                              {doc.summary}
                            </p>
                          )}
                        </div>
                        
                        {index < results.relevantDocuments.length - 1 && (
                          <Separator className="mt-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {results && results.relevantDocuments.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Relevant Documents Found</h3>
            <p className="text-muted-foreground">
              Try uploading more course materials or using different search terms.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}