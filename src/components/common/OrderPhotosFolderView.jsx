import React, { useState } from 'react';
import MediaThumbnail from './MediaThumbnail';
import { Folder, FolderOpen, Download, ExternalLink, Image as ImageIcon, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * OrderPhotosFolderView
 * Displays client-submitted photos grouped by folder/spread categories.
 * Used by both Production Managers and Editorial Designers.
 */
export default function OrderPhotosFolderView({ uploadedPhotos = [], onDownloadFolder, downloadingFolder }) {
  // Group photos by folderName
  const grouped = {};

  (uploadedPhotos || []).forEach((photo, idx) => {
    const folder = photo.folderName && photo.folderName.trim() ? photo.folderName.trim() : 'General Photos';
    if (!grouped[folder]) {
      grouped[folder] = [];
    }
    grouped[folder].push({ ...photo, index: idx + 1 });
  });

  const folderNames = Object.keys(grouped);

  // By default, open the first folder, collapse others if many
  const [openFolders, setOpenFolders] = useState(() => {
    const initial = {};
    folderNames.forEach((name, i) => {
      initial[name] = i === 0;
    });
    return initial;
  });

  const toggleFolder = (name) => {
    setOpenFolders((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  if (!uploadedPhotos || uploadedPhotos.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          backgroundColor: '#FAFAF9',
          border: '1px dashed #D6D3D1',
          borderRadius: '8px',
          color: '#78716C',
          fontSize: '13px',
        }}
      >
        <ImageIcon size={24} color="#A8A29E" style={{ margin: '0 auto 8px auto' }} />
        <p style={{ margin: 0 }}>No photos have been uploaded for this magazine order.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#78716C' }}>
          Client Photo Folders ({uploadedPhotos.length} Total Assets across {folderNames.length} {folderNames.length === 1 ? 'Folder' : 'Folders'})
        </span>
      </div>

      {folderNames.map((folderName) => {
        const photos = grouped[folderName];
        const isOpen = openFolders[folderName] === true;

        return (
          <div
            key={folderName}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E7E5E4',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
            }}
          >
            {/* Folder Header */}
            <div
              onClick={() => toggleFolder(folderName)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: isOpen ? '#FAF5EA' : '#FAFAF9',
                borderBottom: isOpen ? '1px solid rgba(197, 160, 89, 0.25)' : 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isOpen ? (
                  <FolderOpen size={18} color="#C5A059" />
                ) : (
                  <Folder size={18} color="#C5A059" />
                )}
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1C1917' }}>
                  {folderName}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: '#C5A059',
                    color: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    letterSpacing: '0.4px',
                  }}
                >
                  {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onDownloadFolder && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDownloadFolder(folderName);
                    }}
                    disabled={Boolean(downloadingFolder)}
                    title={`Download all photos in ${folderName} as a ZIP`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 9px',
                      border: '1px solid #C5A059',
                      borderRadius: '5px',
                      backgroundColor: '#FFFFFF',
                      color: '#8A6A30',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: downloadingFolder ? 'wait' : 'pointer',
                    }}
                  >
                    <Download size={13} />
                    {downloadingFolder === folderName ? 'Preparing ZIP...' : 'Download folder ZIP'}
                  </button>
                )}
                <span style={{ fontSize: '11px', color: '#78716C', fontWeight: '600' }}>
                  {isOpen ? 'Collapse' : 'Expand'}
                </span>
                {isOpen ? <ChevronDown size={16} color="#78716C" /> : <ChevronRight size={16} color="#78716C" />}
              </div>
            </div>

            {/* Folder Photos Grid */}
            {isOpen && (
              <div style={{ padding: '16px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {photos.map((photo, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: '#FAFAF9',
                        border: '1px solid #E7E5E4',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'box-shadow 0.2s ease',
                      }}
                    >
                      <div style={{ position: 'relative', width: '100%', height: '100px', backgroundColor: '#1C1917' }}>
                        <MediaThumbnail photo={photo} />
                      </div>

                      <div
                        style={{
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          backgroundColor: '#FFFFFF',
                          borderTop: '1px solid #E7E5E4',
                        }}
                      >
                        <span
                          title={photo.originalName}
                          style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#1C1917',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '90px',
                          }}
                        >
                          {photo.originalName || `Photo ${photo.index}`}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <a
                            href={photo.url}
                            target="_blank"
                            rel="noreferrer"
                            title="Open full size in new tab"
                            style={{
                              color: '#78716C',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ExternalLink size={13} />
                          </a>
                          <a
                            href={photo.url}
                            download={photo.originalName || `photo-${photo.index}.jpg`}
                            target="_blank"
                            rel="noreferrer"
                            title="Download asset"
                            style={{
                              color: '#C5A059',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Download size={13} />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
