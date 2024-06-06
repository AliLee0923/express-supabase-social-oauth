export const extractTweetId = (url: string): string | null => {
  const regex = /status\/(\d+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export const extractYoutubeVideoId = (url: string): string | null => {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export const extractInstagramMediaId = (url: string): string | null => {
  const regex = /(?:\/p\/|\/tv\/|\/reel\/)([\w-]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export const extractLinkedinPostId = (url: string): string | null => {
  const regex = /\/posts\/([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};
