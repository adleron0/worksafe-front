import useVerify from "@/hooks/use-verify";

const Customers = () => {

  const { can, has } = useVerify();
  if (!can('view_inventarios') || !has('Confinus')) return null;
  return (
    <>
      <div>Customers</div>
      <span>Administrar Usuários</span>
    </>
  );
};

export default Customers;