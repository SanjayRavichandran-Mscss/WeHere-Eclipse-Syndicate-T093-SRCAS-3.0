require('dotenv').config();

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud';

/**
 * Uploads a video buffer to IPFS via Pinata and returns the CID + gateway URL.
 * @param {Buffer} fileBuffer - raw video bytes
 * @param {string} fileName - original file name
 */
const uploadToIPFS = async (fileBuffer, fileName) => {
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT is not set. Add it to WeHere_Backend/.env');
  }

  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: 'video/mp4' });
  formData.append('file', blob, fileName);

  formData.append('pinataMetadata', JSON.stringify({ name: fileName }));
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Pinata upload failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const cid = data.IpfsHash;

  return {
    cid,
    gatewayUrl: `${PINATA_GATEWAY}/ipfs/${cid}`,
  };
};

module.exports = { uploadToIPFS };
