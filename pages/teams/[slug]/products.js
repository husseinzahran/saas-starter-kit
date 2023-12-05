import React, { useState } from 'react';
import axios from 'axios';
import {  StyleSheet} from '@react-pdf/renderer';
import useTeam from 'hooks/useTeam';


export default function ShopifyPage() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [tag, setTag] = useState('');
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { team } = useTeam();

    //console.log(team);
    const handleFilter = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/shopify', {
                params: { start_date: startDate, end_date: endDate, vendor: team.name, tag: tag }
            });
            setData(response.data);
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setIsLoading(false);
        }
    };

    // Styles for PDF
    const styles = StyleSheet.create({
      page: {
        flexDirection: 'column',
        backgroundColor: '#E4E4E4'
      },
      table: {
        display: 'flex',
        width: 'auto', // Adjusts to the available space
        borderStyle: 'solid',
        borderColor: '#000',
        borderWidth: 1,
        alignSelf: 'center',
      },
      row: {
        flexDirection: 'row',
        flexGrow: 1,
      },
      cell: {
        flexGrow: 1, // Each cell takes up equal space
        padding: 5,
        borderStyle: 'solid',
        borderColor: '#000',
        borderWidth: 1,
      },
    });

    const inputStyle = {
      backgroundColor: 'white',
      padding: '5px',
      margin: '5px',
      border: '1px solid #ccc'
  };

  const buttonStyle = {
      backgroundColor: 'white',
      color: 'black',
      border: '1px solid black',
      padding: '10px 20px',
      margin: '5px',
      cursor: 'pointer'
  };

  

    const downloadTableAsHtml = () => {
      // Convert the table to a HTML string
      const tableHtml = document.querySelector('.data-table').outerHTML;
      const htmlBlob = new Blob([tableHtml], { type: 'text/html' });
  
      // Create a link element to download the blob
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(htmlBlob);
      downloadLink.download = `${team.name}-table.html`;
  
      // Append the link, trigger the download, and remove the link
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
  };
  

    return (
        <div className="flex gap-6 flex-col">
            <h1>Production Orders Management</h1>
            <input type="date"  style={inputStyle} class="w-full max-w-md" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <input type="date"  style={inputStyle} class="w-full max-w-md" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <input type="text" style={inputStyle} class="w-full max-w-md" value={tag} onChange={(e) => setTag(e.target.value)} />
            <button onClick={handleFilter} style={buttonStyle}>Filter</button>

            <style jsx>{`
    .download-button {
        background-color: lightblue;
        border: 1px solid black;
        color: black;
        padding: 10px 20px;
        margin: 10px 0;
        cursor: pointer;
        transition: background-color 0.3s;
    }

    .download-button:hover {
        background-color: #add8e6; /* Slightly darker blue on hover */
    }

    /* ... other styles ... */
`}</style>
                  <button onClick={downloadTableAsHtml} className="download-button">Download Table</button>


            {isLoading ? (
                <p>Loading...</p>
            ) : (
                <>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Product Name</th>
                            <th>Arabic Title</th>
                            <th>Pattern Code</th>
                           
                            <th>Total Quantity</th>
                            <th>Image</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, index) => (
                            <tr key={index}>
                                <td>{item.sku}</td>
                                <td>{item.productName}</td>
                                <td>{item.arabicTitle}</td>
                                <td>{item.patternCode}  --  </td>
                               
                                <td>{item.totalFulfillableQuantity}</td>
                                <td>
                                    {item.mainImage && (
                                        <img src={item.mainImage} alt={item.productName} width="50px" height="80px"/>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                </>
            )}
        </div>
    );
}
