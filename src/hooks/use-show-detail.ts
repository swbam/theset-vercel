
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useShowDetails } from '@/hooks/use-show-details';
import { useArtistTracks } from '@/hooks/use-artist-tracks';
import { useSongManagement } from '@/hooks/use-song-management';
import { useAuth } from '@/contexts/auth';

export function useShowDetail(id: string | undefined) {
  const [documentMetadata, setDocumentMetadata] = useState({
    title: '',
    description: ''
  });
  const { isAuthenticated, login } = useAuth();
  
  // Get show details and Spotify artist ID
  const { 
    show, 
    isLoadingShow, 
    isError, 
    showError, 
    spotifyArtistId 
  } = useShowDetails(id);
  
  // Set document metadata when show data is available
  useEffect(() => {
    if (show && !isLoadingShow) {
      const artistName = show.artist?.name || 'Artist';
      const venueName = show.venue?.name || 'Venue';
      const venueCity = show.venue?.city || '';
      const venueState = show.venue?.state || '';
      const venueLocation = venueCity && venueState ? `${venueCity}, ${venueState}` : (venueCity || venueState || 'Location');
      
      const showDate = new Date(show.date);
      const formattedDate = showDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short', 
        day: 'numeric', 
        year: 'numeric'
      });
      
      const title = `TheSet | ${artistName} at ${venueName} in ${venueLocation} | ${formattedDate}`;
      const description = `Vote on ${artistName}'s setlist for their show at ${venueName} in ${venueLocation} on ${formattedDate}. Influence what songs they'll play live!`;
      
      setDocumentMetadata({
        title,
        description
      });
    }
  }, [show, isLoadingShow]);
  
  // Optimize track loading with better caching
  const artistTracksResult = useArtistTracks(show?.artist_id, spotifyArtistId);
  
  // Extract the needed fields from the useArtistTracks response with defaults
  const {
    tracks = [],
    isLoading: isLoadingTracks = false,
    error: tracksError = null,
    isError: isTracksError = false,
    initialSongs = [],
    storedTracksData = [],
    getAvailableTracks = (setlist: any[]) => []
  } = artistTracksResult;
  
  // For backward compatibility, create these properties
  const isLoadingAllTracks = isLoadingTracks;
  const allTracksData = { tracks };
  
  // Song management (voting, adding songs)
  const {
    setlist,
    isConnected,
    selectedTrack,
    setSelectedTrack,
    handleVote,
    handleAddSong,
    anonymousVoteCount
  } = useSongManagement(id || '', initialSongs, isAuthenticated, login);
  
  // Compute available tracks with memoization to prevent recalculations
  const availableTracks = useMemo(() => {
    if (storedTracksData && Array.isArray(storedTracksData) && storedTracksData.length > 0) {
      const setlistIds = new Set((setlist || []).map(song => song.id));
      return storedTracksData.filter((track: any) => !setlistIds.has(track.id));
    }
    
    if (typeof getAvailableTracks === 'function') {
      return getAvailableTracks(setlist || []);
    }
    
    return [];
  }, [storedTracksData, setlist, getAvailableTracks]);
  
  // Add song handler
  const handleAddSongClick = useCallback(() => {
    if (storedTracksData && Array.isArray(storedTracksData) && storedTracksData.length > 0) {
      handleAddSong({ tracks: storedTracksData });
    } else if (allTracksData && allTracksData.tracks) {
      handleAddSong(allTracksData);
    }
  }, [storedTracksData, allTracksData, handleAddSong]);
  
  return {
    show,
    setlist,
    loading: {
      show: isLoadingShow,
      tracks: isLoadingTracks,
      allTracks: isLoadingAllTracks
    },
    error: {
      show: isError ? showError : null
    },
    connected: isConnected,
    songManagement: {
      selectedTrack,
      setSelectedTrack,
      handleVote,
      handleAddSong: handleAddSongClick,
      anonymousVoteCount
    },
    availableTracks,
    documentMetadata
  };
}
