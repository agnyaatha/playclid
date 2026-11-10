/** Re-created on every navigation, so each new page eases in with a ball rolling across under the header. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span aria-hidden className="page-ball" />
      <div className="page-enter flex flex-1 flex-col">{children}</div>
    </>
  );
}
