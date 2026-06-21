import VerticalShell from "@/components/VerticalShell";
import Hero from "@/components/Hero";
import Strengths from "@/components/sections/Strengths";
import Process from "@/components/sections/Process";
import Cases from "@/components/sections/Cases";
import Reviews from "@/components/sections/Reviews";
import ContactCTA from "@/components/sections/ContactCTA";

export default function GymPage() {
  return (
    <VerticalShell vertical="gym">
      <Hero vertical="gym" />
      <Strengths vertical="gym" />
      <Process vertical="gym" />
      <Cases vertical="gym" />
      <Reviews vertical="gym" />
      <ContactCTA vertical="gym" />
    </VerticalShell>
  );
}
