const MainLayout=({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) =>{
    return <div className="pt-10">{children}</div>
}

export default MainLayout;