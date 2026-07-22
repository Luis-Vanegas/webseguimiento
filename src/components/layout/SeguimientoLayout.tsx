import { useState } from 'react'
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AssessmentIcon from '@mui/icons-material/Assessment'
import RateReviewIcon from '@mui/icons-material/RateReview'
import MapIcon from '@mui/icons-material/Map'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import TimelineIcon from '@mui/icons-material/Timeline'
import LogoutIcon from '@mui/icons-material/Logout'
import EngineeringIcon from '@mui/icons-material/Engineering'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useUsuarioActual } from '../../features/auth/useUsuarioActual'
import { COLOR_ACENTO, COLOR_SIDEBAR } from '../../theme/theme'
import type { RolUsuario } from '../../types/seguimiento.types'

const DRAWER_WIDTH = 240

const ETIQUETA_ROL: Record<RolUsuario, string> = {
  ingeniero: 'Ingeniero',
  visitador: 'Visitador',
  visualizador: 'Visualizador',
}

// roles omitido = visible para todos. "Mis visitas"/"Revisar" son flujos de
// campo, no aplican a un visualizador; "Gestión" es al revés, solo para él.
const ITEMS: { to: string; label: string; icon: JSX.Element; roles?: RolUsuario[] }[] = [
  { to: '/seguimiento/calendario', label: 'Calendario', icon: <CalendarMonthIcon /> },
  { to: '/seguimiento/mis-visitas', label: 'Mis visitas', icon: <AssignmentIcon />, roles: ['ingeniero', 'visitador'] },
  { to: '/seguimiento/revisar', label: 'Revisar visitas', icon: <RateReviewIcon />, roles: ['ingeniero', 'visitador'] },
  { to: '/seguimiento/mapa', label: 'Mapa de obras', icon: <MapIcon /> },
  { to: '/seguimiento/linea-tiempo', label: 'Línea de tiempo', icon: <TimelineIcon /> },
  { to: '/seguimiento/gestion', label: 'Gestión', icon: <AssessmentIcon />, roles: ['visualizador'] },
]

export function SeguimientoLayout() {
  const theme = useTheme()
  const esEscritorio = useMediaQuery(theme.breakpoints.up('md'))
  const [abierto, setAbierto] = useState(false)
  const navigate = useNavigate()
  const { usuario } = useUsuarioActual()
  const itemsVisibles = ITEMS.filter((item) => !item.roles || (usuario && item.roles.includes(usuario.rol)))

  async function cerrarSesion() {
    await supabase.auth.signOut()
    navigate('/seguimiento/login')
  }

  const contenidoDrawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ gap: 1.5 }}>
        <EngineeringIcon sx={{ color: COLOR_ACENTO }} />
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
            Seguimiento
          </Typography>
          <Typography sx={{ fontSize: 12, opacity: 0.7, lineHeight: 1.2 }}>
            de Obras
          </Typography>
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      <List sx={{ flex: 1, px: 1 }}>
        {itemsVisibles.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            onClick={() => setAbierto(false)}
            sx={{
              color: 'rgba(255,255,255,0.75)',
              borderRadius: 2,
              mb: 0.5,
              '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 40 },
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' },
              '&.active': {
                backgroundColor: 'rgba(41, 182, 232, 0.18)',
                color: COLOR_ACENTO,
                fontWeight: 600,
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: 14, fontWeight: 'inherit' }}
            />
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 34, height: 34, bgcolor: COLOR_ACENTO, fontSize: 15 }}>
          {(usuario?.nombre ?? '?').charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>
            {usuario?.nombre ?? '—'}
          </Typography>
          <Chip
            label={usuario ? ETIQUETA_ROL[usuario.rol] : '—'}
            size="small"
            sx={{
              height: 18,
              fontSize: 10,
              bgcolor: 'rgba(41, 182, 232, 0.18)',
              color: COLOR_ACENTO,
            }}
          />
        </Box>
        <Tooltip title="Cerrar sesión">
          <IconButton size="small" onClick={cerrarSesion} sx={{ color: 'rgba(255,255,255,0.6)' }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f6fa' }}>
      {!esEscritorio && (
        <AppBar position="fixed" sx={{ backgroundColor: COLOR_SIDEBAR }}>
          <Toolbar variant="dense">
            <IconButton color="inherit" edge="start" onClick={() => setAbierto(true)}>
              <MenuIcon />
            </IconButton>
            <Typography sx={{ ml: 1, fontWeight: 600, fontSize: 15 }}>
              Seguimiento de Obras
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      <Drawer
        variant={esEscritorio ? 'permanent' : 'temporary'}
        open={esEscritorio || abierto}
        onClose={() => setAbierto(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            backgroundColor: COLOR_SIDEBAR,
            color: '#fff',
            borderRight: 'none',
          },
        }}
      >
        {contenidoDrawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 2, md: 3 },
          mt: { xs: 6, md: 0 },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
