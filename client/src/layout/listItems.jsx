import * as React from "react";
import { Link } from "react-router-dom";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PeopleIcon from "@mui/icons-material/People";
import BarChartIcon from "@mui/icons-material/BarChart";
import LayersIcon from "@mui/icons-material/Layers";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import StoreIcon from "@mui/icons-material/Store";
import SettingsIcon from "@mui/icons-material/Settings";
import GroupIcon from "@mui/icons-material/Group";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

export const MainListItems = () => {
  const userRole = localStorage.getItem('userRole');
  console.log('Current userRole from localStorage:', userRole);

  return (
    <React.Fragment>
      <ListItemButton component={Link} to="/dashboard">
        <ListItemIcon>
          <DashboardIcon />
        </ListItemIcon>
        <ListItemText primary="Dashboard"/>
      </ListItemButton>
      <ListItemButton component={Link} to="/sales">
        <ListItemIcon>
          <ShoppingCartIcon />
        </ListItemIcon>
        <ListItemText primary="Sales"/>
      </ListItemButton>
      <ListItemButton component={Link} to="/customers">
        <ListItemIcon>
          <PeopleIcon />
        </ListItemIcon>
        <ListItemText primary="Customers"/>
      </ListItemButton>
      <ListItemButton component={Link} to="/inventory">
        <ListItemIcon>
          <StoreIcon />
        </ListItemIcon>
        <ListItemText primary="Inventory"/>
      </ListItemButton>
      <ListItemButton component={Link} to="/finance">
        <ListItemIcon>
          <MonetizationOnIcon />
        </ListItemIcon>
        <ListItemText primary="Finance"/>
      </ListItemButton>
      <ListItemButton component={Link} to="/credits">
        <ListItemIcon>
          <CreditCardIcon />
        </ListItemIcon>
        <ListItemText primary="Credits"/>
      </ListItemButton>
      <ListItemButton component={Link} to="/assets">
        <ListItemIcon>
          <BusinessCenterIcon />
        </ListItemIcon>
        <ListItemText primary="Assets"/>
      </ListItemButton>
      <ListItemButton component={Link} to="/products">
        <ListItemIcon>
          <LayersIcon />
        </ListItemIcon>
        <ListItemText primary="Products"/>
      </ListItemButton>
      <ListItemButton component={Link} to="/reports">
        <ListItemIcon>
          <BarChartIcon />
        </ListItemIcon>
        <ListItemText primary="Reports"/>
      </ListItemButton>
      <ListItemButton component={Link} to="/team">
        <ListItemIcon>
          <GroupIcon />
        </ListItemIcon>
        <ListItemText primary="Team"/>
      </ListItemButton>
      {userRole && userRole.toLowerCase() === 'owner' && (
        <ListItemButton component={Link} to="/admin">
          <ListItemIcon>
            <AdminPanelSettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Admin"/>
        </ListItemButton>
      )}
      <ListItemButton component={Link} to="/settings">
        <ListItemIcon>
          <SettingsIcon />
        </ListItemIcon>
        <ListItemText primary="Settings"/>
      </ListItemButton>
    </React.Fragment>
  );
};