import './App.css'
import Dashboard from './Components/Dashboard/Dashboard'
import Login from './Components/Login/Login'

import { createBrowserRouter, RouterProvider} from 'react-router-dom'

const router = createBrowserRouter([
  {
    path: '/',
    element: <div><Login/></div>
  },
  {
    path: '/dashboard',
    element: <div><Dashboard/></div>
  }
])




function App() {


  return (
   <div>
      <RouterProvider router={router}/>

   </div>
  )
}

export default App
