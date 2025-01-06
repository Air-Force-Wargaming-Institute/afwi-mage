import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@material-ui/core';
import { getApiUrl } from '../config';

function CSVPreview({ filename }) {
  const [previewData, setPreviewData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCSVPreview = async () => {
      console.log("Fetching preview for:", filename);
      try {
        const response = await axios.get(getApiUrl('EXTRACTION', `/api/extraction/csv-preview/${filename}`));
        console.log("Preview data:", response.data);
        setPreviewData(response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching CSV preview:', error);
        console.error('Error response:', error.response);
        setError(error.response?.data?.detail || error.message);
      }
    };

    if (filename) {
      fetchCSVPreview();
    }
  }, [filename]);

  if (error) {
    return (
      <Typography color="error">
        Error loading preview: {error}
        <br />
        Please check the backend logs for more details.
      </Typography>
    );
  }

  if (!Array.isArray(previewData) || previewData.length === 0) {
    return <Typography>No preview available for {filename}</Typography>;
  }

  const headers = Object.keys(previewData[0] || {});

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {headers.map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {previewData.map((row, index) => (
            <TableRow key={index}>
              {headers.map((header) => (
                <TableCell key={`${index}-${header}`}>{row[header]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default CSVPreview;
