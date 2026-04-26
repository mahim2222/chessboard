
interface PropsType {
  children: any
}

const AppLayout=({children}: PropsType)=>{
return(
<div className="app_layout">
  <div className="app_layout__header-slot" />
  {children}
</div>
)
}

export default AppLayout