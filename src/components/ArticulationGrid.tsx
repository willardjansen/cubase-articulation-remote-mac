'use client';

import { Articulation, ExpressionMap, groupArticulations, downloadRemoteAssignments, countAutoAssignedRemotes } from '@/lib/expressionMapParser';
import { ArticulationButton } from './ArticulationButton';
import { useState, useMemo } from 'react';

interface ArticulationGridProps {
  expressionMap: ExpressionMap;
  columns?: number;
  buttonSize?: 'small' | 'medium' | 'large';
}

export function ArticulationGrid({ 
  expressionMap, 
  columns = 4,
  buttonSize = 'medium' 
}: ArticulationGridProps) {
  const [activeArticulationId, setActiveArticulationId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'attribute' | 'direction'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Group and filter articulations
  const filteredArticulations = useMemo(() => {
    let arts = expressionMap.articulations;
    
    // Filter by type
    if (filterType === 'attribute') {
      arts = arts.filter(a => a.articulationType === 0);
    } else if (filterType === 'direction') {
      arts = arts.filter(a => a.articulationType === 1);
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      arts = arts.filter(a => 
        a.name.toLowerCase().includes(query) ||
        a.shortName.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query)
      );
    }
    
    return arts;
  }, [expressionMap.articulations, filterType, searchQuery]);

  // Group by group number
  const groupedArticulations = useMemo(() => {
    return groupArticulations(filteredArticulations);
  }, [filteredArticulations]);

  const handleActivate = (articulation: Articulation) => {
    setActiveArticulationId(articulation.id);
  };

  // Check if we have multiple groups
  const hasMultipleGroups = groupedArticulations.size > 1;

  // Count articulation types
  const typeCount = useMemo(() => {
    const attributes = expressionMap.articulations.filter(a => a.articulationType === 0).length;
    const directions = expressionMap.articulations.filter(a => a.articulationType === 1).length;
    return { attributes, directions };
  }, [expressionMap.articulations]);

  // Count auto-assigned remotes
  const autoAssignedCount = useMemo(() => {
    return countAutoAssignedRemotes(expressionMap);
  }, [expressionMap]);

  const handleExportRemotes = () => {
    downloadRemoteAssignments(expressionMap);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header and filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h2 className="text-lg font-semibold text-cubase-text truncate max-w-full">
          {expressionMap.name}
        </h2>
        
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-cubase-surface border border-cubase-accent 
                       text-cubase-text text-sm w-40 focus:outline-none focus:ring-2 
                       focus:ring-cubase-highlight"
          />
          
          {/* Type filter - only show if both types exist */}
          {typeCount.attributes > 0 && typeCount.directions > 0 && (
            <div className="flex rounded-lg overflow-hidden border border-cubase-accent">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors
                  ${filterType === 'all' 
                    ? 'bg-cubase-highlight text-white' 
                    : 'bg-cubase-surface text-cubase-muted hover:bg-cubase-accent'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('attribute')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors
                  ${filterType === 'attribute' 
                    ? 'bg-cubase-highlight text-white' 
                    : 'bg-cubase-surface text-cubase-muted hover:bg-cubase-accent'}`}
              >
                Attr ({typeCount.attributes})
              </button>
              <button
                onClick={() => setFilterType('direction')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors
                  ${filterType === 'direction' 
                    ? 'bg-cubase-highlight text-white' 
                    : 'bg-cubase-surface text-cubase-muted hover:bg-cubase-accent'}`}
              >
                Dir ({typeCount.directions})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Articulation count and auto-assigned warning */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-cubase-muted text-sm">
          {filteredArticulations.length} articulation{filteredArticulations.length !== 1 ? 's' : ''}
        </p>

        {autoAssignedCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-orange-500/20 border border-orange-500/50">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-xs text-orange-300">
              {autoAssignedCount} auto-assigned remote{autoAssignedCount !== 1 ? 's' : ''}
            </span>
            <button
              onClick={handleExportRemotes}
              className="text-xs text-orange-200 underline hover:no-underline ml-1"
            >
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      {hasMultipleGroups ? (
        // Render by groups
        <div className="space-y-6">
          {Array.from(groupedArticulations.entries())
            .sort(([a], [b]) => a - b)
            .map(([groupNum, arts]) => (
              <div key={groupNum} className="space-y-2">
                <h3 className="text-sm font-medium text-cubase-muted">
                  Group {groupNum + 1}
                </h3>
                <div 
                  className="grid gap-2"
                  style={{ 
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` 
                  }}
                >
                  {arts.map(art => (
                    <ArticulationButton
                      key={art.id}
                      articulation={art}
                      isActive={art.id === activeArticulationId}
                      onActivate={handleActivate}
                      size={buttonSize}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        // Single grid
        <div 
          className="grid gap-2"
          style={{ 
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` 
          }}
        >
          {filteredArticulations.map(art => (
            <ArticulationButton
              key={art.id}
              articulation={art}
              isActive={art.id === activeArticulationId}
              onActivate={handleActivate}
              size={buttonSize}
            />
          ))}
        </div>
      )}

      {filteredArticulations.length === 0 && (
        <div className="text-center py-8 text-cubase-muted">
          No articulations found
        </div>
      )}
    </div>
  );
}
