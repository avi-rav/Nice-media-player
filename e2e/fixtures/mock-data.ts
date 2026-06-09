/**
 * Mock Pexels API response data used across E2E tests.
 * Using mocked routes keeps tests fast and deterministic.
 */

export const MOCK_VIDEOS_RESPONSE = {
  page: 1,
  per_page: 15,
  total_results: 50,
  url: 'https://www.pexels.com/search/videos/nature/',
  videos: [
    {
      id: 1001,
      width: 1920,
      height: 1080,
      duration: 30,
      url: 'https://www.pexels.com/video/1001/',
      image: 'https://images.pexels.com/videos/1001/free-video-1001.jpg',
      user: { id: 1, name: 'John Doe', url: 'https://www.pexels.com/@johndoe' },
      video_files: [
        {
          id: 2001,
          quality: 'hd',
          file_type: 'video/mp4',
          width: 1920,
          height: 1080,
          link: 'https://videos.pexels.com/1001/1080p.mp4',
        },
        {
          id: 2002,
          quality: 'sd',
          file_type: 'video/mp4',
          width: 1280,
          height: 720,
          link: 'https://videos.pexels.com/1001/720p.mp4',
        },
      ],
      video_pictures: [
        { id: 3001, picture: 'https://images.pexels.com/videos/1001/pic1.jpg', nr: 0 },
      ],
    },
    {
      id: 1002,
      width: 3840,
      height: 2160,
      duration: 45,
      url: 'https://www.pexels.com/video/1002/',
      image: 'https://images.pexels.com/videos/1002/free-video-1002.jpg',
      user: { id: 2, name: 'Jane Smith', url: 'https://www.pexels.com/@janesmith' },
      video_files: [
        {
          id: 2003,
          quality: 'uhd',
          file_type: 'video/mp4',
          width: 3840,
          height: 2160,
          link: 'https://videos.pexels.com/1002/4k.mp4',
        },
        {
          id: 2004,
          quality: 'hd',
          file_type: 'video/mp4',
          width: 1920,
          height: 1080,
          link: 'https://videos.pexels.com/1002/1080p.mp4',
        },
      ],
      video_pictures: [
        { id: 3002, picture: 'https://images.pexels.com/videos/1002/pic1.jpg', nr: 0 },
      ],
    },
    {
      id: 1003,
      width: 1280,
      height: 720,
      duration: 60,
      url: 'https://www.pexels.com/video/1003/',
      image: 'https://images.pexels.com/videos/1003/free-video-1003.jpg',
      user: { id: 3, name: 'Bob Wilson', url: 'https://www.pexels.com/@bobwilson' },
      video_files: [
        {
          id: 2005,
          quality: 'sd',
          file_type: 'video/mp4',
          width: 1280,
          height: 720,
          link: 'https://videos.pexels.com/1003/720p.mp4',
        },
      ],
      video_pictures: [
        { id: 3003, picture: 'https://images.pexels.com/videos/1003/pic1.jpg', nr: 0 },
      ],
    },
  ],
};

export const MOCK_SEARCH_RESPONSE = {
  page: 1,
  per_page: 15,
  total_results: 1,
  url: 'https://www.pexels.com/search/videos/ocean/',
  videos: [
    {
      id: 1004,
      width: 1920,
      height: 1080,
      duration: 20,
      url: 'https://www.pexels.com/video/1004/',
      image: 'https://images.pexels.com/videos/1004/free-video-1004.jpg',
      user: { id: 4, name: 'Ocean Films', url: 'https://www.pexels.com/@oceanfilms' },
      video_files: [
        {
          id: 2006,
          quality: 'hd',
          file_type: 'video/mp4',
          width: 1920,
          height: 1080,
          link: 'https://videos.pexels.com/1004/1080p.mp4',
        },
      ],
      video_pictures: [
        { id: 3004, picture: 'https://images.pexels.com/videos/1004/pic1.jpg', nr: 0 },
      ],
    },
  ],
};

export const MOCK_EMPTY_RESPONSE = {
  page: 1,
  per_page: 15,
  total_results: 0,
  url: 'https://www.pexels.com/search/videos/xyznonexistent/',
  videos: [],
};

export const MOCK_PAGE2_RESPONSE = {
  page: 2,
  per_page: 15,
  total_results: 50,
  url: 'https://www.pexels.com/search/videos/nature/',
  videos: [
    {
      id: 1005,
      width: 1920,
      height: 1080,
      duration: 35,
      url: 'https://www.pexels.com/video/1005/',
      image: 'https://images.pexels.com/videos/1005/free-video-1005.jpg',
      user: { id: 5, name: 'Page Two Author', url: 'https://www.pexels.com/@page2' },
      video_files: [
        {
          id: 2007,
          quality: 'hd',
          file_type: 'video/mp4',
          width: 1920,
          height: 1080,
          link: 'https://videos.pexels.com/1005/1080p.mp4',
        },
      ],
      video_pictures: [
        { id: 3005, picture: 'https://images.pexels.com/videos/1005/pic1.jpg', nr: 0 },
      ],
    },
  ],
};
