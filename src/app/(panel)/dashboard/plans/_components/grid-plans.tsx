import { subscriptionPlans } from "@/utils/plans/index";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { SubscriptionButton } from "./subscription-button";

export function GridPlans() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 max-w-5xl mx-auto py-8">
      {subscriptionPlans.map((plan, index) => (
        <Card
          key={plan.id}
          className={`flex flex-col w-full mx-auto p-0 relative transition-transform hover:-translate-y-2 duration-300 ${
            index === 1
              ? "border-2 border-primary shadow-xl shadow-primary/20"
              : "border border-border shadow-md"
          }`}
        >
          {index === 1 && (
            <div className="bg-primary w-full py-2 text-center rounded-t-lg">
              <p className="text-primary-foreground font-bold text-sm tracking-wide uppercase">
                Promoção Exclusiva
              </p>
            </div>
          )}
          <CardHeader className={index !== 1 ? "pt-8" : ""}>
            <CardTitle className="font-display text-2xl md:text-3xl font-bold text-foreground">
              {plan.name}
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2 min-h-[48px]">
              {plan.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="mb-6 flex flex-col">
              <span className="text-muted-foreground line-through text-sm font-medium font-mono tabular-nums">
                De R$ {plan.oldPrice.toFixed(2).replace(".", ",")}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-mono text-4xl md:text-5xl font-bold tabular-nums text-foreground">
                  R$ {plan.price.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-muted-foreground font-medium">/mês</span>
              </div>
            </div>

            <ul className="space-y-4 mb-6 flex-1">
              {plan.features.map((feature, featureIndex) => (
                <li key={featureIndex} className="flex items-start gap-3">
                  <Check
                    className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      index === 1 ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-foreground/80 text-sm md:text-base leading-snug">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="mt-auto pb-8">
            <SubscriptionButton
              type={plan.id === "BASIC" ? "BASIC" : "PROFESSIONAL"}
            />
          </CardFooter>
        </Card>
      ))}
    </section>
  );
}
