import React, { useState, useEffect } from 'react';

const SalesSummary = () => {
  const [salesData, setSalesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // State for loading indicator

  useEffect(() => {
    const startDate = '2023-12-01 00:00:00.000+02:00';
    const endDate = '2023-12-01 24:00:00.000+02:00';
    const url = `/api/sales?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;

    setIsLoading(true); // Start loading
    fetch(url)
      .then(response => response.json())
      .then(data => {
        aggregateData(data.orders);
        setIsLoading(false); // Stop loading after data processing
      })
      .catch(error => {
        console.error('Error:', error);
        setIsLoading(false); // Stop loading on error
      });
  }, []);

  const aggregateData = (orders) => {
    const summary = {};

    orders.forEach(order => {
        const date = order.created_at.split('T')[0];
        //const date = '2023-12-01'; // Placeholder, replace with actual date field from each order

      if (!summary[date]) {
        summary[date] = { count: 0, totalAmount: 0 };
      }

      summary[date].count += 1;
      summary[date].totalAmount += order.line_items.reduce((total, item) => {
        return total + parseFloat(item.price);
      }, 0);
    });

    setSalesData(Object.entries(summary).map(([date, data]) => ({ date, ...data })));
  };

  return (
    <div>
      <h1>Sales Summary</h1>
      {isLoading ? (
        <p>Loading...</p> // Display loading indicator
      ) : (
        <ul>
          {salesData.map(({ date, count, totalAmount }) => (
            <li key={date}>
              <strong>Date:</strong> {date}, <strong>Orders Count:</strong> {count}, <strong>Total Amount:</strong> {totalAmount.toFixed(2)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SalesSummary;
