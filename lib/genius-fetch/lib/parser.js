function parseArtist(data, textFormat) {
  if (!data) {
    return null;
  }
  const result = {
    id: data.id,
    url: data.url,
    name: data.name,
    description: undefined,
    image: data.image_url
  };
  if (data.description) {
    result.description = data.description[textFormat];
  }
  else {
    delete result.description;
  }
  return result;
}

function parseAlbum(data, textFormat) {
  if (!data) {
    return null;
  }
  const releaseDateComponents = data.release_date_components || {};
  const result = {
    id: data.id,
    url: data.url,
    title: {
      regular: data.name,
      full: data.full_title
    },
    description: undefined,
    releaseDate: {
      year: releaseDateComponents.year,
      month: releaseDateComponents.month,
      day: releaseDateComponents.day,
      text: data.release_date,
    },
    image: data.cover_art_url,
    artist: parseArtist(data.artist)
  };
  if (data.description_annotation && data.description_annotation.is_description) {
    const annotations = data.description_annotation.annotations;
    if (Array.isArray(annotations) && annotations.length > 0 && annotations[0].body) {
      result.description = annotations[0].body[textFormat];
    }
  }
  else {
    delete result.description;
  }
  if (!result.releaseDate.year && !result.releaseDate.month && !result.releaseDate.day && !result.releaseDate.text) {
    delete result.releaseDate;
  }
  return result;
}

function parseSong(data, textFormat) {
  if (!data) {
    return null;
  }
  const result = {
    id: data.id,
    url: data.url,
    title: {
      regular: data.title,
      withFeatured: data.title_with_featured,
      full: data.full_title
    },
    artists: {
      primary: parseArtist(data.primary_artist),
      featured: [],
      text: data.artist_names
    },
    album: data.album ? parseAlbum(data.album) : undefined,
    description: data.description ? data.description[textFormat] : undefined,
    releaseDate: data.release_date,
    image: data.song_art_image_url,
    hasLyrics: data.lyrics_state === 'complete',
    embed: data.embed_content
  };

  if (Array.isArray(data.featured_artists)) {
    for (const artist of data.featured_artists) {
      result.artists.featured.push(parseArtist(artist));
    }
  }

  if (result.album == undefined) {
    delete result.album;
  }

  if (result.description == undefined) {
    delete result.description;
  }
  
  if (result.releaseDate == undefined) {
    delete result.releaseDate;
  }

  if (result.embed == undefined) {
    delete result.embed;
  }

  return result;
}

module.exports = {
  parseAlbum,
  parseArtist,
  parseSong
};
