import underConstructionImg from "@/assets/under-construction.png";

const UnderConstruction = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <img
        src={underConstructionImg}
        alt="Under Construction"
        className="w-64 h-64 object-contain mb-8"
      />
      <h1 className="text-4xl font-bold text-foreground mb-4 text-center">
        Under Construction
      </h1>
      <p className="text-lg text-muted-foreground text-center max-w-md">
        We're working hard to bring you something amazing. Please check back soon!
      </p>
    </div>
  );
};

export default UnderConstruction;
