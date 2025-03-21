
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Save show to database
 */
export async function saveShowToDatabase(show: any) {
  try {
    if (!show || !show.id) {
      console.error("Invalid show object:", show);
      return null;
    }
    
    console.log(`Saving show to database: ${show.name} (ID: ${show.id})`);
    
    // Check if show already exists first
    try {
      const { data: dbShow, error: checkError } = await supabase
        .from('shows')
        .select('id, updated_at')
        .eq('id', show.id)
        .maybeSingle();
      
      if (checkError) {
        if (checkError.code === '42501') {
          console.log("Permission denied when checking show", show.name, "in database - continuing with API data");
        } else {
          console.error("Error checking show in database:", checkError);
        }
        // Continue with insert/update anyway
      }
      
      // If show exists and was updated recently, don't update it
      if (dbShow) {
        const lastUpdated = new Date(dbShow.updated_at || 0);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate < 24) {
          console.log(`Show ${show.name} was updated ${hoursSinceUpdate.toFixed(1)} hours ago. No update needed.`);
          return dbShow;
        }
        
        console.log(`Show ${show.name} exists but was updated ${hoursSinceUpdate.toFixed(1)} hours ago. Updating...`);
      } else {
        console.log(`Show ${show.name} is new, creating record`);
      }
    } catch (checkError) {
      console.error("Error checking if show exists:", checkError);
      // Continue to try adding the show anyway
    }
    
    // Prepare show data for upsert
    const showData = {
      id: show.id,
      name: show.name,
      artist_id: show.artist_id,
      venue_id: show.venue_id,
      date: show.date && new Date(show.date).toISOString(),
      image_url: show.image_url || show.imageUrl || show.image,
      ticket_url: show.ticket_url || show.ticketUrl,
      genre_ids: Array.isArray(show.genre_ids) ? show.genre_ids : [],
      updated_at: new Date().toISOString()
    };
    
    try {
      // Try to insert or update the show
      const { data, error } = await supabase
        .from('shows')
        .upsert(showData)
        .select();
      
      if (error) {
        if (error.code === '42501') {
          console.log("Permission denied when saving show", show.name, "- trying insert-only approach");
        } else {
          console.error("Error saving show to database:", error);
        }
        
        // If it's a permission error, try an insert-only approach
        const { data: insertData, error: insertError } = await supabase
          .from('shows')
          .insert(showData)
          .select();
          
        if (insertError) {
          console.error("Insert-only approach for show also failed:", insertError);
          return showData; // Return our data object as fallback
        }
        
        console.log(`Successfully inserted show ${show.name} using insert-only approach`);
        return insertData?.[0] || showData;
      }
      
      console.log(`Successfully saved show ${show.name} to database: ${data ? 'Success' : 'No data returned'}`);
      return data?.[0] || showData;
    } catch (saveError) {
      console.error("Error in saveShowToDatabase:", saveError);
      return showData; // Return our data object as fallback
    }
  } catch (error) {
    console.error("Error in saveShowToDatabase:", error);
    return show; // Return the original show object as fallback
  }
}

/**
 * Get show from database
 */
export async function getShowFromDatabase(showId: string) {
  try {
    console.log(`Fetching show details for ID: ${showId} from database`);
    
    const { data, error } = await supabase
      .from('shows')
      .select(`
        *,
        artist:artist_id (*),
        venue:venue_id (*)
      `)
      .eq('id', showId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching show from database:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error in getShowFromDatabase:", error);
    return null;
  }
}
