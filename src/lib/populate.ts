import { getAllFiles, addNode, generateId, VFSNode } from './vfs';

export const populateDummyData = async () => {
  try {
    const existingFiles = await getAllFiles();
    if (existingFiles.length > 0) return; // Already populated

    console.log("Populating dummy data...");

    // Create a folder
    const folderId = generateId();
    const folderNode: VFSNode = {
      id: folderId,
      name: 'My Media',
      type: 'folder',
      parentId: null,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    await addNode(folderNode);

    // Fetch an image
    try {
      const imgRes = await fetch('https://picsum.photos/seed/gallery/800/600');
      const imgBlob = await imgRes.blob();
      await addNode({
        id: generateId(),
        name: 'vacation_photo.jpg',
        type: 'file',
        parentId: folderId,
        data: imgBlob,
        mimeType: 'image/jpeg',
        size: imgBlob.size,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      });
    } catch (e) {
      console.error("Failed to fetch image", e);
    }

    // Fetch a video
    try {
      // Using a known CORS-friendly video URL
      const vidRes = await fetch('https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
      const vidBlob = await vidRes.blob();
      await addNode({
        id: generateId(),
        name: 'sample_video.mp4',
        type: 'file',
        parentId: folderId,
        data: vidBlob,
        mimeType: 'video/mp4',
        size: vidBlob.size,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      });
    } catch (e) {
      console.error("Failed to fetch video", e);
    }

    // Fetch an audio file
    try {
      // Using a known CORS-friendly audio URL
      const audRes = await fetch('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
      const audBlob = await audRes.blob();
      await addNode({
        id: generateId(),
        name: 'alarm_sound.ogg',
        type: 'file',
        parentId: folderId,
        data: audBlob,
        mimeType: 'audio/ogg',
        size: audBlob.size,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      });
    } catch (e) {
      console.error("Failed to fetch audio", e);
    }

    console.log("Dummy data populated!");
    window.dispatchEvent(new Event('vfs-updated'));
  } catch (error) {
    console.error("Error populating dummy data:", error);
  }
};
