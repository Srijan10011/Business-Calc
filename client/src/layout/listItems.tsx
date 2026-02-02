import * as React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import LayersIcon from '@mui/icons-material/Layers';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import StoreIcon from '@mui/icons-material/Store';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import GroupIcon from '@mui/icons-material/Group';

export const mainListItems = (
  <React.Fragment>
    <ListItemButton component={RouterLink} to="/dashboard">
      <ListItemIcon>
        <DashboardIcon />
      </ListItemIcon>
      <ListItemText primary="Dashboard" />
    </ListItemButton>
    <ListItemButton component={RouterLink} to="/sales">
      <ListItemIcon>
        <ShoppingCartIcon />
      </ListItemIcon>
      <ListItemText primary="Sales" />
    </ListItemButton>
    <ListItemButton component={RouterLink} to="/customers">
      <ListItemIcon>
        <PeopleIcon />
      </ListItemIcon>
      <ListItemText primary="Customers" />
    </ListItemButton>
    <ListItemButton component={RouterLink} to="/inventory">
      <ListItemIcon>
        <StoreIcon />
      </ListItemIcon>
      <ListItemText primary="Inventory" />
    </ListItemButton>
    <ListItemButton component={RouterLink} to="/finance">
      <ListItemIcon>
        <MonetizationOnIcon />
      </ListItemIcon>
      <ListItemText primary="Finance" />
    </ListItemButton>
    <ListItemButton component={RouterLink} to="/assets">
      <ListItemIcon>
        <BusinessCenterIcon />
      </ListItemIcon>
      <ListItemText primary="Assets" />
    </ListItemButton>
    <ListItemButton component={RouterLink} to="/products">
      <ListItemIcon>
        <LayersIcon />
      </ListItemIcon>
      <ListItemText primary="Products" />
    </ListItemButton>
    <ListItemButton component={RouterLink} to="/reports">
      <ListItemIcon>
        <BarChartIcon />
      </ListItemIcon>
      <ListItemText primary="Reports" />
    </ListItemButton>
    <ListItemButton component={RouterLink} to="/team">
      <ListItemIcon>
        <GroupIcon />
      </ListItemIcon>
      <ListItemText primary="Team" />
    </ListItemButton>
    <ListItemButton component={RouterLink} to="/settings">
      <ListItemIcon>
        <SettingsIcon />
      </ListItemIcon>
      <ListItemText primary="Settings" />
    </ListItemButton>
  </React.Fragment>
);
