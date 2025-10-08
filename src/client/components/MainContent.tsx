import React from 'react';
import DateIdeasList from './DateIdeasList';
import ShouldDoAgainList from './ShouldDoAgainList';

const MainContent: React.FC = () => {
  return (
    <div className="content">
      <DateIdeasList />
      <ShouldDoAgainList />
    </div>
  );
};

export default MainContent;
