import VerticalShell from "@/components/VerticalShell";
import Hero from "@/components/Hero";
import Strengths from "@/components/sections/Strengths";
import Process from "@/components/sections/Process";
import Cases from "@/components/sections/Cases";
import Reviews from "@/components/sections/Reviews";
import ContactCTA from "@/components/sections/ContactCTA";

export default function MedicalPage() {
  return (
    <VerticalShell vertical="hospital">
      <Hero vertical="hospital" />
      <Cases vertical="hospital" />
      <Strengths vertical="hospital" />
      <Process vertical="hospital" />
      <Reviews vertical="hospital" />
      <ContactCTA vertical="hospital" />
    </VerticalShell>
  );
}
